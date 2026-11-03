import { Check, Minus, Plus, Gauge, ShieldCheck } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { DisplayMath } from './MathMarkup'
import { ImageExportButton } from './ImageExportButton'
import type { ToastTone } from '../types'

interface PreviewPanelProps {
  latex: string
  scale: number
  onScaleChange: (scale: number) => void
  onNotify: (message: string, tone?: ToastTone) => void
}

export function PreviewPanel({ latex, scale, onScaleChange, onNotify }: PreviewPanelProps) {
  const { t } = useI18n()
  const mathRef = useRef<HTMLDivElement>(null)
  const [horizontalOverflow, setHorizontalOverflow] = useState(false)
  const decrease = () => onScaleChange(Math.max(0.7, Math.round((scale - 0.1) * 10) / 10))
  const increase = () => onScaleChange(Math.min(1.5, Math.round((scale + 0.1) * 10) / 10))

  useLayoutEffect(() => {
    const element = mathRef.current
    if (!element) {
      setHorizontalOverflow(false)
      return
    }

    const updateOverflow = () => {
      setHorizontalOverflow(element.scrollWidth > element.clientWidth + 1)
    }
    updateOverflow()

    const resizeObserver = new ResizeObserver(updateOverflow)
    resizeObserver.observe(element)
    if (element.firstElementChild) resizeObserver.observe(element.firstElementChild)
    window.addEventListener('resize', updateOverflow)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateOverflow)
    }
  }, [latex, scale])

  return (
    <section className="workspace-card output-card" aria-labelledby="output-title">
      <header className="card-header">
        <div className="card-title-group">
          <span className="card-index">02</span>
          <div>
            <div className="card-title-line">
              <h2 id="output-title">{t('output.title')}</h2>
              <span>OUTPUT</span>
            </div>
            <p>{t('output.subtitle')}</p>
          </div>
        </div>
        <div className="preview-controls">
          <div className="scale-control" aria-label={t('preview.scaleAria')}>
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={decrease}
              aria-label={t('preview.zoomOut')}
            >
              <Minus size={14} aria-hidden="true" />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={increase}
              aria-label={t('preview.zoomIn')}
            >
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <ImageExportButton targetRef={mathRef} disabled={!latex.trim()} onNotify={onNotify} />
        </div>
      </header>

      <div className="preview-surface">
        <div className="preview-watermark" aria-hidden="true">
          LATEX
        </div>
        {latex.trim() ? (
          <div
            ref={mathRef}
            className={`preview-math ${horizontalOverflow ? 'preview-math--overflowing' : ''}`}
            style={{ '--preview-scale': String(scale) } as CSSProperties}
            tabIndex={horizontalOverflow ? 0 : -1}
            aria-label={horizontalOverflow ? t('preview.horizontalScroll') : undefined}
          >
            <span className="preview-export-source">
              <DisplayMath latex={latex} />
            </span>
          </div>
        ) : (
          <div className="preview-empty">
            <span className="preview-empty__mark">∑</span>
            <h3>{t('preview.waiting')}</h3>
            <p>{t('preview.instructions')}</p>
            <div className="preview-empty__hint">
              <Check size={14} aria-hidden="true" />
              {t('preview.localOnly')}
            </div>
          </div>
        )}
        {horizontalOverflow && (
          <span className="preview-scroll-hint" aria-hidden="true">
            ↔ {t('preview.horizontalScroll')}
          </span>
        )}
      </div>

      <footer className="output-footer">
        <div className="output-footer__item">
          <Gauge size={15} aria-hidden="true" />
          <span>{t('preview.liveRender')}</span>
          <strong>{latex.trim() ? t('preview.ready') : t('preview.idle')}</strong>
        </div>
        <div className="output-footer__item">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>{t('preview.editData')}</span>
          <strong>{t('preview.local')}</strong>
        </div>
        <div className="output-footer__chars">
          {t('preview.characters', { count: latex.length })}
        </div>
      </footer>
    </section>
  )
}
