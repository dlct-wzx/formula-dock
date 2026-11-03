import { KeyRound, Puzzle, ScanLine, ShieldCheck, Sparkles } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'

export function OcrExtensionNotice() {
  const { t } = useI18n()

  return (
    <div className="tool-panel ocr-extension-notice">
      <div className="ocr-extension-notice__hero">
        <span className="ocr-extension-notice__icon" aria-hidden="true">
          <Puzzle size={30} />
        </span>
        <span className="section-kicker">{t('webOcr.kicker')}</span>
        <h2>{t('webOcr.title')}</h2>
        <p>{t('webOcr.body')}</p>
      </div>

      <div className="ocr-extension-steps">
        <article className="ocr-extension-step">
          <span className="ocr-extension-step__index">01</span>
          <Puzzle size={20} aria-hidden="true" />
          <strong>{t('webOcr.installTitle')}</strong>
          <p>{t('webOcr.installBody')}</p>
        </article>
        <article className="ocr-extension-step">
          <span className="ocr-extension-step__index">02</span>
          <KeyRound size={20} aria-hidden="true" />
          <strong>{t('webOcr.keyTitle')}</strong>
          <p>{t('webOcr.keyBody')}</p>
        </article>
        <article className="ocr-extension-step">
          <span className="ocr-extension-step__index">03</span>
          <ScanLine size={20} aria-hidden="true" />
          <strong>{t('webOcr.useTitle')}</strong>
          <p>{t('webOcr.useBody')}</p>
        </article>
      </div>

      <div className="ocr-extension-privacy">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>{t('webOcr.privacy')}</span>
        <Sparkles size={14} aria-hidden="true" />
        <strong>{t('webOcr.extensionBadge')}</strong>
      </div>
    </div>
  )
}