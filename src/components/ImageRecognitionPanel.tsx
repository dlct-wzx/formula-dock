import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'
import {
  AlertCircle,
  Check,
  ClipboardPaste,
  Copy,
  CornerDownLeft,
  Image as ImageIcon,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from 'lucide-react'
import { formatBytes } from '../lib/latex'
import { recogniseImageWithMineruDirect } from '../lib/extension/ocr'
import type { ExtensionSettings } from '../lib/extension/settings'
import type { OcrFormula, OcrResponse, OcrStatus, ToastTone } from '../types'
import { DisplayMath } from './MathMarkup'

interface ImageRecognitionPanelProps {
  mineruMode?: 'mock' | 'live'
  mineruConfigured?: boolean
  extensionMode?: boolean
  extensionSettings?: ExtensionSettings | null
  onInsert: (latex: string, cursorBack?: number) => void
  onNotify: (message: string, tone?: ToastTone) => void
}

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

const STATUS_COPY: Record<OcrStatus, string> = {
  idle: '等待识别',
  uploading: '正在上传图片',
  pending: '已进入 MinerU 队列',
  processing: 'MinerU 正在解析公式',
  done: '识别完成',
  error: '识别失败',
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
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

async function readResponse(response: Response): Promise<OcrResponse> {
  try {
    return (await response.json()) as OcrResponse
  } catch {
    return {}
  }
}

export function ImageRecognitionPanel({
  mineruMode,
  mineruConfigured,
  extensionMode = false,
  extensionSettings,
  onInsert,
  onNotify,
}: ImageRecognitionPanelProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const resultsRef = useRef<HTMLElement | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [status, setStatus] = useState<OcrStatus>('idle')
  const [formulas, setFormulas] = useState<OcrFormula[]>([])
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'mock' | 'live' | undefined>(mineruMode)

  const busy = status === 'uploading' || status === 'pending' || status === 'processing'
  const statusLabel = useMemo(() => STATUS_COPY[status], [status])

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(
    () => () => {
      abortRef.current?.abort()
    },
    [],
  )

  useEffect(() => {
    if (extensionMode) {
      setMode(extensionSettings?.mineruToken ? 'live' : 'mock')
      return
    }
    setMode(mineruMode)
  }, [extensionMode, extensionSettings?.mineruToken, mineruMode])

  useEffect(() => {
    if (status !== 'done' || formulas.length === 0) return
    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 120)
    return () => window.clearTimeout(timer)
  }, [formulas.length, status])

  const selectFile = useCallback(
    (nextFile: File) => {
      if (!ACCEPTED_TYPES.has(nextFile.type)) {
        onNotify('仅支持 PNG、JPEG 和 WebP 图片。', 'error')
        return
      }
      if (nextFile.size > MAX_BYTES) {
        onNotify('图片不能超过 10 MB。', 'error')
        return
      }

      abortRef.current?.abort()
      setFile(nextFile)
      setStatus('idle')
      setFormulas([])
      setMessage('')
    },
    [onNotify],
  )

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
        item.type.startsWith('image/'),
      )
      if (!imageItem) return
      const pastedFile = imageItem.getAsFile()
      if (!pastedFile) return
      event.preventDefault()
      const extension = pastedFile.type === 'image/jpeg' ? 'jpg' : pastedFile.type.split('/')[1]
      selectFile(
        new File([pastedFile], `clipboard-${Date.now()}.${extension}`, {
          type: pastedFile.type,
        }),
      )
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [selectFile])

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (nextFile) selectFile(nextFile)
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (nextFile) selectFile(nextFile)
  }

  const handleDropzoneKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }

  const reset = () => {
    abortRef.current?.abort()
    setFile(null)
    setStatus('idle')
    setFormulas([])
    setMessage('')
  }

  const recognise = async () => {
    if (!file || busy) return

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('uploading')
    setFormulas([])
    setMessage('')

    try {
      if (extensionMode) {
        if (!extensionSettings) throw new Error('插件设置正在加载，请稍后再试。')
        if (!extensionSettings.mineruToken) {
          throw new Error('请先在插件设置中配置 MinerU Token，再识别图片。')
        }

        setMode('live')
        const payload = await recogniseImageWithMineruDirect(
          file,
          extensionSettings,
          controller.signal,
          (progress) => {
            setStatus(progress.state)
            setMessage(progress.message)
          },
        )
        setMode(payload.mode || 'live')
        setFormulas(payload.formulas || [])
        setMessage(
          payload.message ||
            (payload.formulas?.length
              ? `已提取 ${payload.formulas.length} 个公式，可插入编辑器或复制源码。`
              : ''),
        )
        setStatus('done')
        return
      }

      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
        signal: controller.signal,
      })
      const payload = await readResponse(response)
      if (!response.ok || payload.error) {
        throw new Error(payload.error || `识别请求失败（HTTP ${response.status}）。`)
      }

      setMode(payload.mode || mineruMode)

      if (payload.formulas?.length) {
        setFormulas(payload.formulas)
        setMessage(
          payload.message || `已提取 ${payload.formulas.length} 个公式，可插入编辑器或复制源码。`,
        )
        setStatus('done')
        return
      }

      if (!payload.taskId) {
        throw new Error('识别服务没有返回任务 ID。')
      }

      setStatus(payload.state === 'processing' ? 'processing' : 'pending')
      setMessage(
        payload.mode === 'live'
          ? '图片已上传至 MinerU，正在等待解析结果。通常需要数秒到数十秒。'
          : '正在生成识别结果。',
      )

      const startedAt = Date.now()
      let pollCount = 0
      while (Date.now() - startedAt < 180_000) {
        await wait(pollCount === 0 ? 1_200 : 2_400, controller.signal)
        pollCount += 1

        const pollResponse = await fetch(`/api/ocr/${encodeURIComponent(payload.taskId)}`, {
          signal: controller.signal,
        })
        const pollPayload = await readResponse(pollResponse)
        if (!pollResponse.ok || pollPayload.error) {
          throw new Error(pollPayload.error || `查询识别结果失败（HTTP ${pollResponse.status}）。`)
        }

        setMode(pollPayload.mode || 'live')
        if (pollPayload.progress?.totalPages) {
          setMessage(
            `正在解析第 ${pollPayload.progress.extractedPages || 0} / ${pollPayload.progress.totalPages} 页。`,
          )
        }

        if (pollPayload.state === 'done') {
          setFormulas(pollPayload.formulas || [])
          setMessage(
            pollPayload.message ||
              (pollPayload.formulas?.length
                ? `已提取 ${pollPayload.formulas.length} 个公式，可插入编辑器或复制源码。`
                : ''),
          )
          setStatus('done')
          return
        }
        if (pollPayload.state === 'failed') {
          throw new Error(pollPayload.message || pollPayload.error || 'MinerU 解析失败。')
        }
        setStatus(pollPayload.state === 'processing' ? 'processing' : 'pending')
      }

      throw new Error('识别等待超时，请重试或稍后在 MinerU 控制台检查任务。')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const errorMessage = error instanceof Error ? error.message : '图片识别失败。'
      setStatus('error')
      setMessage(errorMessage)
      onNotify(errorMessage, 'error')
    }
  }

  const copyFormula = async (latex: string) => {
    try {
      await navigator.clipboard.writeText(latex)
      onNotify('LaTeX 已复制到剪贴板。', 'success')
    } catch {
      onNotify('浏览器未允许写入剪贴板。', 'error')
    }
  }

  const insertAll = () => {
    if (!formulas.length) return
    onInsert(formulas.map((formula) => formula.latex).join('\n\n'))
  }

  return (
    <div className="tool-panel ocr-panel">
      <div className="ocr-heading">
        <div>
          <span className="section-kicker">
            <ScanLine size={14} aria-hidden="true" />
            MinerU 图片识别
          </span>
          <h3>截图、拖拽或粘贴一个公式</h3>
        </div>
        <div className="ocr-mode-stack">
          <span className={`mode-badge ${mode === 'live' ? 'mode-badge--live' : ''}`}>
            {extensionMode && !mineruConfigured
              ? 'SETUP REQUIRED'
              : mode === 'live'
                ? extensionMode
                  ? 'EXTENSION LIVE'
                  : 'LIVE API'
                : 'LOCAL MOCK'}
          </span>
          {mineruConfigured === false && mineruMode === 'mock' && (
            <span className="mode-hint">
              {extensionMode ? '在插件设置中配置 MinerU Token' : '配置 Token 后切换真实识别'}
            </span>
          )}
        </div>
      </div>

      <input
        id={inputId}
        ref={inputRef}
        className="sr-only"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInput}
        tabIndex={-1}
      />

      {!file ? (
        <div
          className={`ocr-dropzone ${dragActive ? 'ocr-dropzone--active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={handleDropzoneKeyDown}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget === event.target) setDragActive(false)
          }}
          onDrop={handleDrop}
          aria-describedby={`${inputId}-help`}
        >
          <span className="ocr-dropzone__icon">
            <Upload size={25} aria-hidden="true" />
          </span>
          <strong>上传公式图片</strong>
          <p>点击选择文件，或把图片拖到这里</p>
          <span className="ocr-dropzone__action">
            <ImageIcon size={15} aria-hidden="true" />
            浏览本地图片
          </span>
          <div className="ocr-paste-hint" id={`${inputId}-help`}>
            <ClipboardPaste size={15} aria-hidden="true" />
            截图后直接按 <kbd>Ctrl</kbd> + <kbd>V</kbd> 粘贴
          </div>
        </div>
      ) : (
        <div
          className="ocr-file-card"
          onDragEnter={(event) => {
            event.preventDefault()
            setDragActive(true)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            if (event.currentTarget === event.target) setDragActive(false)
          }}
          onDrop={handleDrop}
        >
          <div className="ocr-preview">
            {previewUrl ? (
              <img src={previewUrl} alt="待识别公式预览" />
            ) : (
              <ImageIcon size={32} aria-hidden="true" />
            )}
            <span className="ocr-preview__scanline" aria-hidden="true" />
          </div>
          <div className="ocr-file-info">
            <span className="section-kicker">待识别图片</span>
            <strong>{file.name}</strong>
            <p>
              {formatBytes(file.size)} · {file.type.replace('image/', '').toUpperCase()}
            </p>
            <div className="ocr-file-actions">
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                <RefreshCw size={14} aria-hidden="true" />
                更换
              </button>
              <button
                type="button"
                className="button button--ghost button--small button--danger"
                onClick={reset}
                disabled={busy}
              >
                <X size={14} aria-hidden="true" />
                移除
              </button>
            </div>
          </div>
          <button
            type="button"
            className="button button--primary ocr-recognise-button"
            onClick={recognise}
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="spin" size={16} aria-hidden="true" />
            ) : (
              <Sparkles size={16} aria-hidden="true" />
            )}
            {busy ? '识别中' : '开始识别'}
          </button>
        </div>
      )}

      {dragActive && file && (
        <div
          className="ocr-drag-overlay"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload size={24} aria-hidden="true" />
          松开鼠标替换图片
        </div>
      )}

      {(busy || status === 'done' || status === 'error') && (
        <section className="ocr-status" aria-live="polite">
          <div className="ocr-status__header">
            <span className={`status-dot status-dot--${status}`} aria-hidden="true" />
            <strong>{statusLabel}</strong>
            {mode && <span className="status-mode">{mode === 'live' ? 'MinerU' : 'Mock'}</span>}
          </div>
          {busy && (
            <div className="progress-track" aria-hidden="true">
              <span />
            </div>
          )}
          {message && (
            <p className={`ocr-message ${status === 'error' ? 'ocr-message--error' : ''}`}>
              {status === 'error' && <AlertCircle size={15} aria-hidden="true" />}
              {status === 'done' && <Check size={15} aria-hidden="true" />}
              {message}
            </p>
          )}
        </section>
      )}

      {status === 'done' && formulas.length > 0 && (
        <section className="ocr-results" aria-labelledby="ocr-results-title" ref={resultsRef}>
          <div className="section-heading">
            <div>
              <span className="section-kicker">识别结果</span>
              <h3 id="ocr-results-title">找到 {formulas.length} 个公式</h3>
            </div>
            {formulas.length > 1 && (
              <button type="button" className="button button--soft button--small" onClick={insertAll}>
                <CornerDownLeft size={14} aria-hidden="true" />
                全部插入
              </button>
            )}
          </div>

          <div className="ocr-formula-list">
            {formulas.map((formula, index) => (
              <article className="ocr-formula-card" key={formula.id}>
                <span className="ocr-formula-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="ocr-formula-preview">
                  <DisplayMath latex={formula.latex} />
                </div>
                <code>{formula.latex}</code>
                <div className="ocr-formula-actions">
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => copyFormula(formula.latex)}
                    title="复制 LaTeX"
                    aria-label="复制 LaTeX"
                  >
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="button button--soft button--small"
                    onClick={() => onInsert(formula.latex)}
                  >
                    <CornerDownLeft size={14} aria-hidden="true" />
                    插入
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {status === 'done' && formulas.length === 0 && (
        <div className="empty-state empty-state--compact">
          <ScanLine size={24} aria-hidden="true" />
          <p>{message || '没有从图片中找到可识别的公式。'}</p>
        </div>
      )}

      <div className="ocr-privacy-note">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>
          {extensionMode
            ? 'Token 保存在 chrome.storage.local；识别时图片直接发送到 MinerU，不经过本项目的 Web 服务。'
            : mode === 'live'
              ? '图片会发送到你配置的 MinerU 服务。项目默认不落盘、不写入数据库。'
              : 'Mock 模式仅在本地返回演示公式，不会上传图片。'}
        </span>
      </div>
    </div>
  )
}
