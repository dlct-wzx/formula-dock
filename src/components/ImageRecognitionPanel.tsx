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
import { useI18n } from '../i18n/I18nContext'
import type { MessageKey } from '../i18n/messages'

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

const STATUS_KEYS: Record<OcrStatus, MessageKey> = {
  idle: 'ocr.status.idle',
  uploading: 'ocr.status.uploading',
  pending: 'ocr.status.pending',
  processing: 'ocr.status.processing',
  done: 'ocr.status.done',
  error: 'ocr.status.error',
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
  const { locale, t } = useI18n()
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
  const statusLabel = useMemo(() => t(STATUS_KEYS[status]), [status, t])

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
        onNotify(t('ocr.invalidType'), 'error')
        return
      }
      if (nextFile.size > MAX_BYTES) {
        onNotify(t('ocr.tooLarge'), 'error')
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
        if (!extensionSettings) throw new Error(t('ocr.settingsLoading'))
        if (!extensionSettings.mineruToken) {
          throw new Error(t('ocr.tokenRequired'))
        }

        setMode('live')
        const payload = await recogniseImageWithMineruDirect(
          file,
          extensionSettings,
          controller.signal,
          (progress) => {
            setStatus(progress.state)
            setMessage(
              progress.state === 'uploading'
                ? t('ocr.uploadingMessage')
                : progress.state === 'pending'
                  ? t('ocr.pendingMessage')
                  : t('ocr.processingGeneric'),
            )
          },
        )
        setMode(payload.mode || 'live')
        setFormulas(payload.formulas || [])
        setMessage(
          payload.message ||
            (payload.formulas?.length
              ? t('ocr.extractedCount', { count: payload.formulas.length })
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
        throw new Error(payload.error || t('ocr.requestFailed', { status: response.status }))
      }

      setMode(payload.mode || mineruMode)

      if (payload.formulas?.length) {
        setFormulas(payload.formulas)
        setMessage(
          payload.message || t('ocr.extractedCount', { count: payload.formulas.length }),
        )
        setStatus('done')
        return
      }

      if (!payload.taskId) {
        throw new Error(t('ocr.taskMissing'))
      }

      setStatus(payload.state === 'processing' ? 'processing' : 'pending')
      setMessage(
        payload.mode === 'live'
          ? t('ocr.waitingLive')
          : t('ocr.generating'),
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
          throw new Error(
            pollPayload.error || t('ocr.pollFailed', { status: pollResponse.status }),
          )
        }

        setMode(pollPayload.mode || 'live')
        if (pollPayload.progress?.totalPages) {
          setMessage(
            t('ocr.parsingPages', {
              page: pollPayload.progress.extractedPages || 0,
              total: pollPayload.progress.totalPages,
            }),
          )
        }

        if (pollPayload.state === 'done') {
          setFormulas(pollPayload.formulas || [])
          setMessage(
            pollPayload.message ||
              (pollPayload.formulas?.length
                ? t('ocr.extractedCount', { count: pollPayload.formulas.length })
                : ''),
          )
          setStatus('done')
          return
        }
        if (pollPayload.state === 'failed') {
          throw new Error(pollPayload.message || pollPayload.error || t('ocr.parseFailed'))
        }
        setStatus(pollPayload.state === 'processing' ? 'processing' : 'pending')
      }

      throw new Error(t('ocr.timeout'))
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      const rawMessage = error instanceof Error ? error.message : ''
      const errorMessage =
        locale === 'en' && (!rawMessage || /[\u3400-\u9fff]/.test(rawMessage))
          ? t('ocr.failure')
          : rawMessage || t('ocr.failure')
      setStatus('error')
      setMessage(errorMessage)
      onNotify(errorMessage, 'error')
    }
  }

  const copyFormula = async (latex: string) => {
    try {
      await navigator.clipboard.writeText(latex)
      onNotify(t('ocr.copied'), 'success')
    } catch {
      onNotify(t('ocr.clipboardDenied'), 'error')
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
            {t('ocr.kicker')}
          </span>
          <h3>{t('ocr.title')}</h3>
        </div>
        <div className="ocr-mode-stack">
          <span className={`mode-badge ${mode === 'live' ? 'mode-badge--live' : ''}`}>
            {extensionMode && !mineruConfigured
              ? t('ocr.modeSetup')
              : mode === 'live'
                ? extensionMode
                  ? t('ocr.modeExtensionLive')
                  : t('ocr.modeLive')
                : t('ocr.modeMock')}
          </span>
          {mineruConfigured === false && mineruMode === 'mock' && (
            <span className="mode-hint">
              {extensionMode ? t('ocr.configureTokenExtension') : t('ocr.configureToken')}
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
          <strong>{t('ocr.uploadTitle')}</strong>
          <p>{t('ocr.uploadBody')}</p>
          <span className="ocr-dropzone__action">
            <ImageIcon size={15} aria-hidden="true" />
            {t('ocr.browse')}
          </span>
          <div className="ocr-paste-hint" id={`${inputId}-help`}>
            <ClipboardPaste size={15} aria-hidden="true" />
            {t('ocr.pasteHint')}
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
              <img src={previewUrl} alt={t('ocr.previewAlt')} />
            ) : (
              <ImageIcon size={32} aria-hidden="true" />
            )}
            <span className="ocr-preview__scanline" aria-hidden="true" />
          </div>
          <div className="ocr-file-info">
            <span className="section-kicker">{t('ocr.pendingImage')}</span>
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
                {t('ocr.change')}
              </button>
              <button
                type="button"
                className="button button--ghost button--small button--danger"
                onClick={reset}
                disabled={busy}
              >
                <X size={14} aria-hidden="true" />
                {t('ocr.remove')}
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
            {busy ? t('ocr.recognizing') : t('ocr.recognize')}
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
          {t('ocr.replaceHint')}
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
              <span className="section-kicker">{t('ocr.results')}</span>
              <h3 id="ocr-results-title">{t('ocr.found', { count: formulas.length })}</h3>
            </div>
            {formulas.length > 1 && (
              <button type="button" className="button button--soft button--small" onClick={insertAll}>
                <CornerDownLeft size={14} aria-hidden="true" />
                {t('ocr.insertAll')}
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
                    title={t('ocr.copyLatex')}
                    aria-label={t('ocr.copyLatex')}
                  >
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="button button--soft button--small"
                    onClick={() => onInsert(formula.latex)}
                  >
                    <CornerDownLeft size={14} aria-hidden="true" />
                    {t('ocr.insert')}
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
          <p>{message || t('ocr.none')}</p>
        </div>
      )}

      <div className="ocr-privacy-note">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>
          {extensionMode
            ? t('ocr.privacyExtension')
            : mode === 'live'
              ? t('ocr.privacyLive')
              : t('ocr.privacyMock')}
        </span>
      </div>
    </div>
  )
}
