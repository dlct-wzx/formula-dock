import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { promises as fsPromises } from 'node:fs'
import { getRuntimeConfig, loadLocalEnv, projectRoot, distDir } from './env.mjs'
import {
  ImageValidationError,
  MAX_IMAGE_BYTES,
  decodeFileName,
  validateImage,
} from './ocr-utils.mjs'
import { getMockOcrResult } from './mock-ocr.mjs'
import { createMineruTask, getMineruTask, MineruError } from './mineru.mjs'

loadLocalEnv()
const config = getRuntimeConfig()

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

const rateBuckets = new Map()

function applySecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function sendJson(response, statusCode, payload) {
  applySecurityHeaders(response)
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function readBody(request, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let total = 0
    let tooLarge = false

    request.on('data', (chunk) => {
      total += chunk.length
      if (total > maxBytes) {
        tooLarge = true
        return
      }
      chunks.push(chunk)
    })

    request.on('end', () => {
      if (tooLarge) {
        reject(new ImageValidationError('图片不能超过 10 MB。', 413, 'IMAGE_TOO_LARGE'))
        return
      }
      resolve(Buffer.concat(chunks))
    })

    request.on('error', reject)
  })
}

function clientAddress(request) {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  return request.socket.remoteAddress || 'unknown'
}

function allowOcrRequest(request) {
  const now = Date.now()
  const key = clientAddress(request)
  const previous = rateBuckets.get(key)
  if (!previous || now - previous.startedAt > 60_000) {
    rateBuckets.set(key, { startedAt: now, count: 1 })
    return true
  }
  previous.count += 1
  return previous.count <= 20
}

function apiError(response, error) {
  if (error instanceof ImageValidationError) {
    sendJson(response, error.statusCode, { error: error.message, code: error.code })
    return
  }
  if (error instanceof MineruError) {
    sendJson(response, error.statusCode || 502, { error: error.message, code: error.code })
    return
  }
  console.error('[api] unexpected error:', error?.message || error)
  sendJson(response, 500, {
    error: '服务端处理失败，请稍后重试。',
    code: 'INTERNAL_ERROR',
  })
}

async function handleApi(request, response, url) {
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, {
      ok: true,
      service: 'formuladock-api',
      mineru: {
        configured: Boolean(config.mineruToken),
        mode: config.mineruMockMode ? 'mock' : 'live',
        model: config.mineruModel,
      },
      limits: {
        maxImageBytes: MAX_IMAGE_BYTES,
        acceptedTypes: ['image/png', 'image/jpeg', 'image/webp'],
      },
    })
    return
  }

  if (request.method === 'POST' && url.pathname === '/api/ocr') {
    if (!allowOcrRequest(request)) {
      sendJson(response, 429, {
        error: '识别请求过于频繁，请稍后再试。',
        code: 'RATE_LIMITED',
      })
      return
    }

    try {
      const contentLength = Number(request.headers['content-length'] || 0)
      if (contentLength > MAX_IMAGE_BYTES) {
        throw new ImageValidationError('图片不能超过 10 MB。', 413, 'IMAGE_TOO_LARGE')
      }

      const buffer = await readBody(request, MAX_IMAGE_BYTES)
      const originalName = decodeFileName(request.headers['x-file-name'])
      const validated = validateImage({
        buffer,
        contentType: request.headers['content-type'],
        fileName: originalName,
      })

      if (config.mineruMockMode) {
        const result = await getMockOcrResult({ fileName: validated.fileName, buffer })
        sendJson(response, 200, result)
        return
      }

      const task = await createMineruTask({
        buffer,
        fileName: validated.fileName,
        token: config.mineruToken,
        modelVersion: config.mineruModel,
        language: config.mineruLanguage,
      })
      sendJson(response, 202, task)
    } catch (error) {
      apiError(response, error)
    }
    return
  }

  if (request.method === 'GET' && /^\/api\/ocr\/[A-Za-z0-9-]+$/.test(url.pathname)) {
    const taskId = url.pathname.split('/').pop()
    try {
      const result = await getMineruTask({ taskId, token: config.mineruToken })
      sendJson(response, 200, result)
    } catch (error) {
      apiError(response, error)
    }
    return
  }

  sendJson(response, 404, { error: '接口不存在。', code: 'NOT_FOUND' })
}

async function serveStatic(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' })
    return
  }

  if (!fs.existsSync(distDir)) {
    sendJson(response, 404, {
      error: '前端尚未构建。开发时请使用 npm run dev，生产环境请先执行 npm run build。',
      code: 'FRONTEND_NOT_BUILT',
    })
    return
  }

  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    sendJson(response, 400, { error: '无效路径。', code: 'INVALID_PATH' })
    return
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let filePath = path.resolve(distDir, relativePath)
  const distPrefix = `${path.resolve(distDir)}${path.sep}`
  if (filePath !== path.resolve(distDir, 'index.html') && !filePath.startsWith(distPrefix)) {
    sendJson(response, 403, { error: '禁止访问该路径。', code: 'FORBIDDEN' })
    return
  }

  try {
    const stat = await fsPromises.stat(filePath)
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html')
  } catch {
    filePath = path.join(distDir, 'index.html')
  }

  try {
    const content = await fsPromises.readFile(filePath)
    const extension = path.extname(filePath).toLowerCase()
    applySecurityHeaders(response)
    const hashedAsset = /-[A-Za-z0-9_-]{8,}\./.test(filePath)
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Content-Length': content.length,
      'Cache-Control': hashedAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
    })
    if (request.method === 'HEAD') response.end()
    else response.end(content)
  } catch {
    sendJson(response, 500, { error: '读取页面文件失败。', code: 'STATIC_READ_FAILED' })
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url)
      return
    }
    await serveStatic(request, response, url)
  } catch (error) {
    apiError(response, error)
  }
})

server.listen(config.port, '0.0.0.0', () => {
  console.log(`[server] http://localhost:${config.port}`)
  console.log(
    `[server] MinerU mode: ${config.mineruMockMode ? 'mock' : `live (${config.mineruModel})`}`,
  )
})

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 3_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

export { server, projectRoot }
