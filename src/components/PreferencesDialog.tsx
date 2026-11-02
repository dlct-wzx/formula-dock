import { useEffect, useState } from 'react'
import { ExternalLink, Settings2, X } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { UiLocale } from '../i18n/messages'
import { normaliseFontSize } from '../lib/preferences'

interface PreferencesDialogProps {
  initialLocale: UiLocale
  initialInterfaceScale: number
  initialFontSize: number
  extensionMode: boolean
  onClose: () => void
  onSave: (preferences: {
    uiLocale: UiLocale
    interfaceScale: number
    editorFontSize: number
  }) => Promise<void>
  onOpenExtensionOptions: () => Promise<void>
}

export function PreferencesDialog({
  initialLocale,
  initialInterfaceScale,
  initialFontSize,
  extensionMode,
  onClose,
  onSave,
  onOpenExtensionOptions,
}: PreferencesDialogProps) {
  const { t } = useI18n()
  const [uiLocale, setUiLocale] = useState<UiLocale>(initialLocale)
  const [interfaceScale, setInterfaceScale] = useState(initialInterfaceScale)
  const [editorFontSize, setEditorFontSize] = useState(initialFontSize)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        uiLocale,
        interfaceScale,
        editorFontSize: normaliseFontSize(editorFontSize),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        className="preferences-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preferences-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="preferences-dialog__header">
          <span className="preferences-dialog__icon">
            <Settings2 size={18} aria-hidden="true" />
          </span>
          <div>
            <h2 id="preferences-title">{t('settings.title')}</h2>
            <p>{t('settings.subtitle')}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t('settings.close')}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="preferences-dialog__body">
          <label className="field">
            <span className="field-label">
              {t('settings.interfaceLanguage')}
              <small>{t('settings.interfaceLanguageHint')}</small>
            </span>
            <select
              value={uiLocale}
              onChange={(event) => setUiLocale(event.target.value as UiLocale)}
              autoFocus
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">
              {t('settings.interfaceScale')}
              <small>{t('settings.interfaceScaleHint')}</small>
            </span>
            <select
              value={interfaceScale}
              onChange={(event) => setInterfaceScale(Number(event.target.value))}
            >
              <option value="90">{t('settings.scaleSmall')}</option>
              <option value="100">{t('settings.scaleStandard')}</option>
              <option value="110">{t('settings.scaleComfortable')}</option>
              <option value="140">{t('settings.scaleLarge')}</option>
              <option value="160">{t('settings.scaleExtraLarge')}</option>
            </select>
          </label>

          <label className="field">
            <span className="field-label">
              {t('settings.editorFontSize')}
              <small>{t('settings.editorFontSizeHint')}</small>
            </span>
            <span className="font-size-control">
              <input
                type="range"
                min="10"
                max="24"
                step="1"
                value={editorFontSize}
                onChange={(event) => setEditorFontSize(normaliseFontSize(event.target.value))}
              />
              <input
                type="number"
                min="10"
                max="24"
                step="1"
                value={editorFontSize}
                onChange={(event) => setEditorFontSize(normaliseFontSize(event.target.value))}
                aria-label={t('settings.editorFontSize')}
              />
              <output>{t('settings.pixels', { size: editorFontSize })}</output>
            </span>
          </label>

          <div className="preferences-dialog__preview" aria-hidden="true">
            <span>LaTeX</span>
            <code style={{ fontSize: `${editorFontSize}px` }}>
              {'E = mc^2 \\quad \\int_0^1 x^2 dx'}
            </code>
          </div>

          {extensionMode && (
            <button
              type="button"
              className="preferences-dialog__link"
              onClick={() => void onOpenExtensionOptions()}
            >
              <ExternalLink size={14} aria-hidden="true" />
              {t('settings.fullOptions')}
            </button>
          )}
        </div>

        <footer className="preferences-dialog__footer">
          <button type="button" className="button button--ghost" onClick={onClose}>
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            className="button button--primary"
            onClick={() => void save()}
            disabled={saving}
          >
            {t('settings.save')}
          </button>
        </footer>
      </section>
    </div>
  )
}
