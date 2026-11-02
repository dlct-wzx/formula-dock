import { Copy, Check, Minus, Plus, Gauge, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { DisplayMath } from './MathMarkup'

interface PreviewPanelProps {
  latex: string
  scale: number
  onScaleChange: (scale: number) => void
  onCopy: () => void
}

export function PreviewPanel({ latex, scale, onScaleChange, onCopy }: PreviewPanelProps) {
  const { t } = useI18n()
  const decrease = () => onScaleChange(Math.max(0.7, Math.round((scale - 0.1) * 10) / 10))
  const increase = () => onScaleChange(Math.min(1.5, Math.round((scale + 0.1) * 10) / 10))

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
          <button type="button" className="button button--ghost button--small" onClick={onCopy}>
            <Copy size={14} aria-hidden="true" />
            {t('preview.copy')}
          </button>
        </div>
      </header>

      <div className="preview-surface">
        <div className="preview-watermark" aria-hidden="true">
          LATEX
        </div>
        {latex.trim() ? (
          <div
            className="preview-math"
            style={{ '--preview-scale': String(scale) } as CSSProperties}
          >
            <DisplayMath latex={latex} />
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
