import { useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PanelRight,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import { openExtensionOptions, type ExtensionSettings } from '../lib/extension/settings'
import { insertLatexIntoActivePage } from '../lib/extension/runtime'
import type { ToastTone } from '../types'
import { useI18n } from '../i18n/I18nContext'
import type { MessageKey } from '../i18n/messages'

interface ExtensionActionBarProps {
  latex: string
  settings: ExtensionSettings | null
  onNotify: (message: string, tone?: ToastTone) => void
}

export function ExtensionActionBar({ latex, settings, onNotify }: ExtensionActionBarProps) {
  const { locale, t } = useI18n()
  const [inserting, setInserting] = useState(false)

  const insertIntoPage = async () => {
    if (!latex.trim()) {
      onNotify(t('ext.empty'), 'info')
      return
    }
    if (!settings) {
      onNotify(t('ext.loading'), 'info')
      return
    }

    setInserting(true)
    try {
      const result = await insertLatexIntoActivePage(latex, settings)
      onNotify(
        locale === 'zh' && result.message ? result.message : t('ext.inserted'),
        'success',
      )
    } catch (error) {
      onNotify(
        locale === 'zh' && error instanceof Error ? error.message : t('ext.insertFailed'),
        'error',
      )
    } finally {
      setInserting(false)
    }
  }

  const openSettings = async () => {
    try {
      await openExtensionOptions()
    } catch (error) {
      onNotify(
        locale === 'zh' && error instanceof Error ? error.message : t('ext.optionsError'),
        'error',
      )
    }
  }

  return (
    <section className="extension-action-bar" aria-label={t('ext.aria')}>
      <div className="extension-action-copy">
        <span className="extension-action-icon">
          <PanelRight size={17} aria-hidden="true" />
        </span>
        <div>
          <span className="extension-action-kicker">{t('ext.kicker')}</span>
          <strong>{t('ext.title')}</strong>
          <small
            className={
              settings?.mineruToken
                ? 'extension-action-status--ready'
                : 'extension-action-status--warning'
            }
          >
            {settings?.mineruToken ? (
              <>
                <ShieldCheck size={12} aria-hidden="true" />
                {t('ext.configured')}
              </>
            ) : (
              <>
                <AlertCircle size={12} aria-hidden="true" />
                {t('ext.missing')}
              </>
            )}
            <span>·</span>
            {settings ? t(`format.${settings.insertFormat}` as MessageKey) : t('common.loading')}
          </small>
        </div>
      </div>

      <div className="extension-action-buttons">
        <button type="button" className="button button--ghost button--small" onClick={openSettings}>
          <Settings2 size={14} aria-hidden="true" />
          {t('ext.settings')}
        </button>
        <button
          type="button"
          className="button button--primary button--small extension-insert-button"
          onClick={insertIntoPage}
          disabled={inserting}
        >
          {inserting ? (
            <LoaderCircle size={14} className="spin" aria-hidden="true" />
          ) : (
            <ArrowUpRight size={14} aria-hidden="true" />
          )}
          {inserting ? t('ext.inserting') : t('ext.insert')}
        </button>
      </div>
    </section>
  )
}
