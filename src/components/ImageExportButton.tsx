import { useEffect, useRef, useState, type RefObject } from 'react'
import { ChevronDown, Download, LoaderCircle } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { ToastTone } from '../types'

type ExportFormat = 'svg' | 'png' | 'jpg'

interface ImageExportButtonProps {
  targetRef: RefObject<HTMLElement | null>
  disabled?: boolean
  onNotify: (message: string, tone?: ToastTone) => void
}

const FORMATS: ExportFormat[] = ['svg', 'png', 'jpg']

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function createCanvas(target: HTMLElement, format: ExportFormat) {
  const source = target.querySelector<HTMLElement>('.preview-export-source')
  if (!source) throw new Error('Formula export source is missing.')

  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.left = '-100000px'
  host.style.top = '0'
  host.style.display = 'inline-block'
  host.style.padding = '28px'
  host.style.background = '#ffffff'
  host.style.color = '#111827'

  const clone = source.cloneNode(true) as HTMLElement
  clone.style.width = 'max-content'
  clone.style.minWidth = '0'
  clone.style.color = '#111827'
  host.appendChild(clone)
  document.body.appendChild(host)

  try {
    const { default: html2canvas } = await import('html2canvas')
    return await html2canvas(host, {
      backgroundColor: '#ffffff',
      scale: 3,
      useCORS: true,
      logging: false,
    })
  } finally {
    host.remove()
  }
}

function canvasToSvg(canvas: HTMLCanvasElement) {
  const pngDataUrl = canvas.toDataURL('image/png')
  const width = canvas.width
  const height = canvas.height
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<image width="${width}" height="${height}" href="${pngDataUrl}" />`,
    '</svg>',
  ].join('')
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function ImageExportButton({ targetRef, disabled = false, onNotify }: ImageExportButtonProps) {
  const { t } = useI18n()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const exportImage = async (format: ExportFormat) => {
    const target = targetRef.current
    if (!target) {
      onNotify(t('preview.exportEmpty'), 'info')
      return
    }

    setOpen(false)
    setExporting(format)
    try {
      const canvas = await createCanvas(target, format)
      const dataUrl =
        format === 'svg'
          ? canvasToSvg(canvas)
          : canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95)
      triggerDownload(dataUrl, `formuladock-formula-${timestamp()}.${format}`)
      onNotify(t('preview.exported', { format: format.toUpperCase() }), 'success')
    } catch {
      onNotify(t('preview.exportFailed'), 'error')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="image-export" ref={rootRef}>
      <button
        type="button"
        className="button button--ghost button--small image-export__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled || Boolean(exporting)}
      >
        {exporting ? (
          <LoaderCircle size={14} className="spin" aria-hidden="true" />
        ) : (
          <Download size={14} aria-hidden="true" />
        )}
        {exporting ? t('preview.exporting') : t('preview.exportImage')}
        <ChevronDown size={14} className="image-export__chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="image-export__menu" role="menu">
          {FORMATS.map((format) => (
            <button
              key={format}
              type="button"
              className="image-export__item"
              role="menuitem"
              onClick={() => void exportImage(format)}
              aria-label={t('preview.exportFormat', { format: format.toUpperCase() })}
            >
              <Download size={15} aria-hidden="true" />
              <span>.{format}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}