import {
  detectImageType,
  normaliseImageFileName,
  processMineruZip,
  toFormulaResponse,
} from '../../../shared/formula-parser.mjs'
import type { OcrResponse } from '../../types'
import type { ExtensionSettings } from './settings'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_RESULT_BYTES = 25 * 1024 * 1024
const POLL_TIMEOUT_MS = 180_000
const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

interface MineruApiResponse {
  ok: boolean
  status: number
  payload?: Record<string, unknown> | null
  error?: string
}

export interface DirectOcrProgress {
  state: 'uploading' | 'pending' | 'processing'
  message: string
  progress?: {
    extractedPages?: number
    totalPages?: number
  }
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

async function requestMineruApi(
  path: string,
  method: 'GET' | 'POST',
  body: Record<string, unknown> | undefined,
  signal: AbortSignal,
): Promise<MineruApiResponse> {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const response = (await chrome.runtime.sendMessage({
    type: 'LATEX_STUDIO_MINERU_API_REQUEST',
    path,
    method,
    body,
  })) as MineruApiResponse | undefined

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!response) throw new Error('扩展后台没有返回 MinerU 响应。')
  return response
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
function providerError(payload: Record<string, unknown>, fallback: string): string {
  const code = String(payload.code ?? '')
  if (code === 'A0202') return 'MinerU Token 无效，请在插件设置中更新。'
  if (code === 'A0211') return 'MinerU Token 已过期，请重新创建。'
  if (code === '-60018') return '今日 MinerU 解析额度已用尽。'
  if (code === '-60009') return 'MinerU 当前任务队列已满，请稍后重试。'
  if (code === 'TOKEN_MISSING') return '请先在插件设置中配置 MinerU Token。'
  if (code === 'NETWORK_ERROR') return '扩展后台无法连接 MinerU，请检查网络。'
  return typeof payload.msg === 'string' && payload.msg ? payload.msg : fallback
}

async function createBatch(
  file: File,
  settings: ExtensionSettings,
  signal: AbortSignal,
): Promise<string> {
  const response = await requestMineruApi(
    '/file-urls/batch',
    'POST',
    {
      files: [
        {
          name: normaliseImageFileName(file.name, file.type),
          data_id: `latexlive-extension-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
          is_ocr: true,
        },
      ],
      model_version: settings.modelVersion,
      enable_formula: true,
      enable_table: false,
      language: settings.language,
    },
    signal,
  )

  const payload = response.payload || {}
  if (!response.ok || payload.code !== 0) {
    throw new Error(
      providerError(
        payload,
        response.error || `申请 MinerU 上传地址失败（HTTP ${response.status}）。`,
      ),
    )
  }

  const data = payload.data as Record<string, unknown> | undefined
  const batchId = typeof data?.batch_id === 'string' ? data.batch_id : ''
  const uploadUrl = Array.isArray(data?.file_urls) ? String(data.file_urls[0] || '') : ''
  if (!batchId || !uploadUrl) throw new Error('MinerU 没有返回有效的上传任务。')

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  const uploadResponse = (await chrome.runtime.sendMessage({
    type: 'LATEX_STUDIO_MINERU_UPLOAD',
    url: uploadUrl,
    dataBase64: await fileToBase64(file),
  })) as { ok?: boolean; status?: number; error?: string } | undefined

  if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
  if (!uploadResponse?.ok) {
    throw new Error(uploadResponse?.error || '图片上传到 MinerU 失败。')
  }
  return batchId
}

function normaliseProviderState(state: unknown): 'pending' | 'processing' | 'done' | 'failed' {
  if (state === 'done') return 'done'
  if (state === 'failed') return 'failed'
  if (state === 'running' || state === 'converting') return 'processing'
  return 'pending'
}

async function pollBatch(
  batchId: string,
  signal: AbortSignal,
  onProgress: (progress: DirectOcrProgress) => void,
): Promise<OcrResponse> {
  const startedAt = Date.now()
  let pollCount = 0

  while (Date.now() - startedAt < POLL_TIMEOUT_MS) {
    await delay(pollCount === 0 ? 1_200 : 2_400, signal)
    pollCount += 1

    const response = await requestMineruApi(
      `/extract-results/batch/${encodeURIComponent(batchId)}`,
      'GET',
      undefined,
      signal,
    )
    const payload = response.payload || {}
    if (!response.ok || payload.code !== 0) {
      throw new Error(
        providerError(payload, response.error || `查询 MinerU 任务失败（HTTP ${response.status}）。`),
      )
    }

    const data = payload.data as Record<string, unknown> | undefined
    const results = Array.isArray(data?.extract_result) ? data.extract_result : []
    const result = results[0] as Record<string, unknown> | undefined
    if (!result) throw new Error('MinerU 尚未返回任务结果。')

    const state = normaliseProviderState(result.state)
    if (state === 'failed') {
      throw new Error(
        typeof result.err_msg === 'string' && result.err_msg
          ? result.err_msg
          : 'MinerU 解析失败，请更换图片后重试。',
      )
    }

    const rawProgress = result.extract_progress as Record<string, unknown> | undefined
    const progress = rawProgress
      ? {
          extractedPages: Number(rawProgress.extracted_pages) || 0,
          totalPages: Number(rawProgress.total_pages) || 0,
        }
      : undefined

    if (state === 'done') {
      const zipUrl = typeof result.full_zip_url === 'string' ? result.full_zip_url : ''
      if (!zipUrl) throw new Error('MinerU 已完成解析，但没有返回结果文件。')

      onProgress({ state: 'processing', message: '正在下载并解析 MinerU 结果。' })
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      const zipResponse = (await chrome.runtime.sendMessage({
        type: 'LATEX_STUDIO_MINERU_DOWNLOAD_ZIP',
        url: zipUrl,
      })) as {
        ok?: boolean
        status?: number
        error?: string
        byteLength?: number
        dataBase64?: string
      } | undefined

      if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      if (!zipResponse?.ok || !zipResponse.dataBase64) {
        throw new Error(zipResponse?.error || '下载 MinerU 结果失败。')
      }
      if ((zipResponse.byteLength || 0) > MAX_RESULT_BYTES) {
        throw new Error('MinerU 结果文件过大。')
      }
      const processed = processMineruZip(base64ToBytes(zipResponse.dataBase64))
      if (!processed.formulas.length) {
        return {
          state: 'done',
          mode: 'live',
          formulas: [],
          message: '解析完成，但没有在结果中找到可提取的 LaTeX 公式。',
        }
      }
      return {
        state: 'done',
        mode: 'live',
        formulas: toFormulaResponse(processed.formulas),
      }
    }

    onProgress({
      state,
      message:
        state === 'processing'
          ? progress?.totalPages
            ? `MinerU 正在解析第 ${progress.extractedPages || 0} / ${progress.totalPages} 页。`
            : 'MinerU 正在解析公式。'
          : '已进入 MinerU 队列，等待解析。',
      progress,
    })
  }

  throw new Error('识别等待超时，请稍后重试。')
}

export async function recogniseImageWithMineruDirect(
  file: File,
  settings: ExtensionSettings,
  signal: AbortSignal,
  onProgress: (progress: DirectOcrProgress) => void,
): Promise<OcrResponse> {
  if (!settings.mineruToken) {
    throw new Error('请先在插件设置中配置 MinerU Token。')
  }
  if (!ACCEPTED_TYPES.has(file.type)) {
    throw new Error('仅支持 PNG、JPEG 和 WebP 图片。')
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('图片不能超过 10 MB。')
  }

  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  if (detectImageType(header) !== file.type) {
    throw new Error('图片内容与文件类型不匹配。')
  }

  onProgress({ state: 'uploading', message: '正在上传图片到 MinerU。' })
  const batchId = await createBatch(file, settings, signal)
  onProgress({ state: 'pending', message: '图片已上传，等待 MinerU 处理。' })
  return pollBatch(batchId, signal, onProgress)
}
