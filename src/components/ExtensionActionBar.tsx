import { useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PanelRight,
  Settings2,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import type { ExtensionSettings } from '../lib/extension/settings'
import {
  HostPermissionRequiredError,
  insertLatexIntoActivePage,
  requestExtensionHostPermission,
} from '../lib/extension/runtime'
import type { ToastTone } from '../types'
import { useI18n } from '../i18n/I18nContext'
import type { MessageKey } from '../i18n/messages'

interface ExtensionActionBarProps {
  latex: string
  settings: ExtensionSettings | null
  onNotify: (message: string, tone?: ToastTone) => void
  onOpenSettings: () => void
}

export function ExtensionActionBar({
  latex,
  settings,
  onNotify,
  onOpenSettings,
}: ExtensionActionBarProps) {
  const { locale, t } = useI18n()
  const [inserting, setInserting] = useState(false)
  const [granting, setGranting] = useState(false)
  const [permissionPattern, setPermissionPattern] = useState<string | null>(null)

  const performInsert = async () => {
    if (!settings) {
      onNotify(t('ext.loading'), 'info')
      return
    }

    setInserting(true)
    try {
      const result = await insertLatexIntoActivePage(latex, settings)
      setPermissionPattern(null)
      onNotify(
        locale === 'zh' && result.message ? result.message : t('ext.inserted'),
        'success',
      )
    } catch (error) {
      if (error instanceof HostPermissionRequiredError) {
        setPermissionPattern(error.originPattern)
        onNotify(t('ext.permissionRequired'), 'info')
        return
      }
      onNotify(
        locale === 'zh' && error instanceof Error ? error.message : t('ext.insertFailed'),
        'error',
      )
    } finally {
      setInserting(false)
    }
  }

  const insertIntoPage = async () => {
    if (!latex.trim()) {
      onNotify(t('ext.empty'), 'info')
      return
    }
    await performInsert()
  }

  const grantAccess = async () => {
    if (!permissionPattern) return
    setGranting(true)
    try {
      const granted = await requestExtensionHostPermission(permissionPattern)
      if (!granted) {
        onNotify(t('ext.permissionDenied'), 'error')
        return
      }
      setPermissionPattern(null)
      await performInsert()
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="extension-actions-stack">
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
          <button type="button" className="button button--ghost button--small" onClick={onOpenSettings}>
            <Settings2 size={14} aria-hidden="true" />
            {t('ext.settings')}
          </button>
          <button
            type="button"
            className="button button--primary button--small extension-insert-button"
            onClick={() => void insertIntoPage()}
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

      {permissionPattern && (
        <section className="extension-permission-prompt" aria-live="polite">
          <span className="extension-permission-icon">
            <ShieldAlert size={16} aria-hidden="true" />
          </span>
          <div>
            <strong>{t('ext.permissionRequired')}</strong>
            <p>{t('ext.permissionHint')}</p>
          </div>
          <button
            type="button"
            className="button button--soft button--small"
            onClick={() => void grantAccess()}
            disabled={granting}
          >
            {granting ? (
              <LoaderCircle size={14} className="spin" aria-hidden="true" />
            ) : (
              <ShieldCheck size={14} aria-hidden="true" />
            )}
            {granting ? t('ext.grantingAccess') : t('ext.grantAccess')}
          </button>
        </section>
      )}
    </div>
  )
}
