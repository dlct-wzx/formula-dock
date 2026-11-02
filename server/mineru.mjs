import { processMineruZip, toFormulaResponse } from './ocr-utils.mjs'

const MINERU_BASE_URL = 'https://mineru.net/api/v4'
const MAX_RESULT_BYTES = 40 * 1024 * 1024
const REQUEST_TIMEOUT_MS = 30_000
const DOWNLOAD_TIMEOUT_MS = 60_000

export class MineruError extends Error {
  constructor(message, code = 'MINERU_ERROR', statusCode = 502) {
    super(message)
    this.name = 'MineruError'
    this.code = code
    this.statusCode = statusCode
  }
}

function authorisationHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  }
}

function friendlyProviderError(code, message) {
  if (code === 'A0202') return 'MinerU Token 无效，请检查 MINERU_API_TOKEN。'
  if (code === 'A0211') return 'MinerU Token 已过期，请重新创建 Token。'
  if (code === -60018) return '今日 MinerU 解析额度已用尽，请稍后再试。'
  if (code === -60009) return 'MinerU 当前任务队列已满，请稍后重试。'
  return message || `MinerU 返回错误 ${code}。`
}

async function readJsonResponse(response) {
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new MineruError('MinerU 返回了无法解析的响应。')
  }

  if (!response.ok) {
    throw new MineruError(
      friendlyProviderError(payload?.code, payload?.msg || `HTTP ${response.status}`),
      String(payload?.code || `HTTP_${response.status}`),
      response.status === 401 || response.status === 403 ? 502 : 502,
    )
  }
  if (payload?.code !== 0) {
    throw new MineruError(
      friendlyProviderError(payload?.code, payload?.msg),
      String(payload?.code || 'MINERU_ERROR'),
    )
  }
  return payload
}

export async function createMineruTask({ buffer, fileName, token, modelVersion, language }) {
  if (!token) {
    throw new MineruError(
      '尚未配置 MINERU_API_TOKEN，请在 .env.local 中填写后再关闭 Mock 模式。',
      'MINERU_NOT_CONFIGURED',
      503,
    )
  }

  const dataId = `latexlive-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
  const createResponse = await fetch(`${MINERU_BASE_URL}/file-urls/batch`, {
    method: 'POST',
    headers: {
      ...authorisationHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [
        {
          name: fileName,
          data_id: dataId,
          is_ocr: true,
        },
      ],
      model_version: modelVersion,
      enable_formula: true,
      enable_table: false,
      language,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    if (error?.name === 'TimeoutError') {
      throw new MineruError('申请 MinerU 上传地址超时，请重试。', 'MINERU_TIMEOUT')
    }
    throw new MineruError('无法连接 MinerU 服务，请检查网络。', 'MINERU_NETWORK')
  })

  const created = await readJsonResponse(createResponse)
  const batchId = created?.data?.batch_id
  const uploadUrl = created?.data?.file_urls?.[0]

  if (!batchId || !uploadUrl) {
    throw new MineruError('MinerU 未返回有效的上传地址。', 'MINERU_UPLOAD_URL_MISSING')
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: buffer,
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  }).catch((error) => {
    if (error?.name === 'TimeoutError') {
      throw new MineruError('图片上传超时，请重试。', 'MINERU_UPLOAD_TIMEOUT')
    }
    throw new MineruError('图片上传到 MinerU 失败。', 'MINERU_UPLOAD_FAILED')
  })

  if (!uploadResponse.ok) {
    throw new MineruError(`图片上传失败（HTTP ${uploadResponse.status}）。`, 'MINERU_UPLOAD_FAILED')
  }

  return {
    taskId: batchId,
    state: 'pending',
    mode: 'live',
  }
}

async function downloadResultZip(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
  }).catch((error) => {
    if (error?.name === 'TimeoutError') {
      throw new MineruError('下载 MinerU 识别结果超时。', 'MINERU_DOWNLOAD_TIMEOUT')
    }
    throw new MineruError('无法下载 MinerU 识别结果。', 'MINERU_DOWNLOAD_FAILED')
  })

  if (!response.ok) {
    throw new MineruError(`下载识别结果失败（HTTP ${response.status}）。`, 'MINERU_DOWNLOAD_FAILED')
  }

  const contentLength = Number(response.headers.get('content-length') || 0)
  if (contentLength > MAX_RESULT_BYTES) {
    throw new MineruError('MinerU 结果文件过大，已停止下载。', 'MINERU_RESULT_TOO_LARGE')
  }

  const arrayBuffer = await response.arrayBuffer()
  if (arrayBuffer.byteLength > MAX_RESULT_BYTES) {
    throw new MineruError('MinerU 结果文件过大，已停止下载。', 'MINERU_RESULT_TOO_LARGE')
  }
  return Buffer.from(arrayBuffer)
}

function normaliseState(providerState) {
  if (providerState === 'done') return 'done'
  if (providerState === 'failed') return 'failed'
  if (providerState === 'running' || providerState === 'converting') return 'processing'
  return 'pending'
}

export async function getMineruTask({ taskId, token }) {
  if (!token) {
    throw new MineruError(
      '尚未配置 MINERU_API_TOKEN，无法查询真实识别任务。',
      'MINERU_NOT_CONFIGURED',
      503,
    )
  }

  const response = await fetch(`${MINERU_BASE_URL}/extract-results/batch/${encodeURIComponent(taskId)}`, {
    headers: authorisationHeaders(token),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((error) => {
    if (error?.name === 'TimeoutError') {
      throw new MineruError('查询 MinerU 任务超时。', 'MINERU_TIMEOUT')
    }
    throw new MineruError('无法连接 MinerU 服务。', 'MINERU_NETWORK')
  })

  const payload = await readJsonResponse(response)
  const result = payload?.data?.extract_result?.[0]
  if (!result) {
    throw new MineruError('MinerU 尚未返回任务结果。', 'MINERU_RESULT_MISSING', 404)
  }

  const state = normaliseState(result.state)
  if (state === 'failed') {
    const message = result.err_msg || 'MinerU 解析失败，请更换图片后重试。'
    return {
      state: 'failed',
      mode: 'live',
      message,
      error: message,
      providerState: result.state,
    }
  }

  if (state !== 'done') {
    return {
      state,
      mode: 'live',
      providerState: result.state,
      progress: result.extract_progress
        ? {
            extractedPages: result.extract_progress.extracted_pages,
            totalPages: result.extract_progress.total_pages,
          }
        : undefined,
    }
  }

  if (!result.full_zip_url) {
    throw new MineruError('MinerU 已完成解析，但没有返回结果文件。', 'MINERU_ZIP_MISSING')
  }

  const zipBuffer = await downloadResultZip(result.full_zip_url)
  const processed = processMineruZip(zipBuffer)
  if (!processed.formulas.length) {
    return {
      state: 'done',
      mode: 'live',
      formulas: [],
      message: '解析完成，但未在结果中找到可提取的 LaTeX 公式。',
    }
  }

  return {
    state: 'done',
    mode: 'live',
    formulas: toFormulaResponse(processed.formulas),
    source: processed.source,
  }
}
