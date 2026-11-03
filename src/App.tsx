import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Braces,
  Copy,
  Moon,
  ScanLine,
  Server,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react'
import { LatexEditor, type LatexEditorHandle } from './components/LatexEditor'
import { QuickToolsPanel } from './components/QuickToolsPanel'
import { FormulaTemplatesPanel } from './components/FormulaTemplatesPanel'
import { ImageRecognitionPanel } from './components/ImageRecognitionPanel'
import { OcrExtensionNotice } from './components/OcrExtensionNotice'
import { PreviewPanel } from './components/PreviewPanel'
import { Toast, type ToastState } from './components/Toast'
import { PreferencesDialog } from './components/PreferencesDialog'
import { formulaCategories, formulaTemplateCount } from './data/formulaTemplates'
import { quickToolCategories, quickToolCount } from './data/quickTools'
import type { ToastTone, ToolTab } from './types'
import {
  DEFAULT_EXTENSION_SETTINGS,
  isExtensionContext,
  openExtensionOptions,
  saveExtensionSettings,
} from './lib/extension/settings'
import { useExtensionSettings } from './lib/extension/useExtensionSettings'
import {
  loadUiPreferences,
  saveUiPreferences,
  type UiPreferences,
} from './lib/preferences'
import { I18nProvider } from './i18n/I18nContext'
import { translate, type UiLocale } from './i18n/messages'
import { localisedFormulaCategory } from './i18n/content'

const TAB_DEFINITIONS: Array<{ id: ToolTab; icon: typeof Zap }> = [
  { id: 'shortcuts', icon: Zap },
  { id: 'templates', icon: BookOpen },
  { id: 'ocr', icon: ScanLine },
]

const THEME_STORAGE_KEY = 'formuladock:theme'
const LEGACY_THEME_STORAGE_KEY = 'latexlive-studio:theme'

function initialTheme(): 'light' | 'dark' {
  const stored =
    localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem(LEGACY_THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const editorRef = useRef<LatexEditorHandle>(null)
  const toastTimerRef = useRef<number | null>(null)
  const [latex, setLatex] = useState('')
  const [activeTab, setActiveTab] = useState<ToolTab>('shortcuts')
  const [previewScale, setPreviewScale] = useState(1)
  const [theme, setTheme] = useState<'light' | 'dark'>(initialTheme)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [webPreferences, setWebPreferences] = useState<UiPreferences>(loadUiPreferences)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const extensionMode = isExtensionContext()
  const { settings: extensionSettings } = useExtensionSettings(extensionMode)

  const locale: UiLocale = extensionMode
    ? extensionSettings?.uiLocale ?? 'zh'
    : webPreferences.uiLocale
  const interfaceScale = extensionMode
    ? extensionSettings?.interfaceScale ?? 100
    : webPreferences.interfaceScale
  const editorFontSize = extensionMode
    ? extensionSettings?.editorFontSize ?? 12
    : webPreferences.editorFontSize
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) =>
    translate(locale, key, values)

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), message, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3_200)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY)
    } catch {
      // Theme persistence is optional.
    }
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = locale === 'en' ? 'en' : 'zh-CN'
    document.documentElement.style.setProperty('--ui-font-scale', String(interfaceScale / 100))
    document.title = locale === 'en' ? 'FormulaDock · Formula workspace' : 'FormulaDock · 公式工作台'
  }, [interfaceScale, locale])


  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    },
    [],
  )

  const insertLatex = (value: string, cursorBack = 0) => {
    editorRef.current?.insertText(value, cursorBack)
    notify(t('toast.inserted'), 'success')
  }

  const copyLatex = async () => {
    if (!latex.trim()) {
      notify(t('toast.empty'), 'info')
      return
    }
    try {
      await navigator.clipboard.writeText(latex)
      notify(t('toast.copied'), 'success')
    } catch {
      notify(t('toast.clipboardDenied'), 'error')
    }
  }

  const clearEditor = () => {
    if (!latex) return
    setLatex('')
    editorRef.current?.focus()
    notify(t('toast.cleared'), 'info')
  }

  const savePreferences = async (preferences: UiPreferences) => {
    if (extensionMode) {
      await saveExtensionSettings({
        ...(extensionSettings ?? DEFAULT_EXTENSION_SETTINGS),
        ...preferences,
      })
    } else {
      setWebPreferences(saveUiPreferences(preferences))
    }
    notify(translate(preferences.uiLocale, 'settings.saved'), 'success')
  }

  const openFullExtensionSettings = async () => {
    try {
      await openExtensionOptions()
      setPreferencesOpen(false)
    } catch {
      notify(t('ext.optionsError'), 'error')
    }
  }

  const extensionMineruReady = Boolean(extensionSettings?.mineruToken)
  const mineruMode = extensionMineruReady ? 'live' : 'mock'
  const mineruConfigured = extensionMineruReady
  const statusText = extensionMineruReady ? t('status.live') : t('status.setup')
  const statusTitle = extensionMineruReady ? t('status.liveTitle') : t('status.setupTitle')

  const tabs = TAB_DEFINITIONS.map(({ id, icon }) => ({
    id,
    icon,
    label:
      id === 'shortcuts'
        ? t('tabs.shortcuts')
        : id === 'templates'
          ? t('tabs.templates')
          : t('tabs.ocr'),
    hint:
      id === 'shortcuts'
        ? t('tabs.shortcutsHint', { count: quickToolCount })
        : id === 'templates'
          ? t('tabs.templatesHint', { count: formulaTemplateCount })
          : extensionMode
            ? t('tabs.ocrHint')
            : t('tabs.ocrExtensionHint'),
  }))

  const categorySeparator = locale === 'zh' ? '、' : ', '
  const categoryNames = formulaCategories
    .map((category) => localisedFormulaCategory(category, locale).title)
    .join(categorySeparator)

  return (
    <I18nProvider locale={locale}>
      <div className={`app ${extensionMode ? 'app--extension' : ''}`} id="top">
        <header className="site-header">
          <a className="brand" href={extensionMode ? '#top' : '/'} aria-label={t('app.home')}>
            <span className="brand-mark">∑</span>
            <span className="brand-copy">
              <strong>
                Formula<em>Dock</em>
              </strong>
              <small>{t('app.tagline')}</small>
            </span>
          </a>

          <div className="header-actions">
            {!extensionMode && (
              <span className="agent-chip">
                <Sparkles size={13} aria-hidden="true" />
                {t('app.agent')}
              </span>
            )}
            {extensionMode && (
              <span
                className={`api-status ${mineruMode === 'live' ? 'api-status--live' : ''}`}
                title={statusTitle}
              >
                <Server size={14} aria-hidden="true" />
                {statusText}
              </span>
            )}
            <button
              type="button"
              className="theme-button"
              onClick={() => setPreferencesOpen(true)}
              aria-label={t('settings.open')}
            >
              <Settings2 size={17} />
            </button>
            <button
              type="button"
              className="theme-button"
              onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
              aria-label={locale === 'en' ? 'Switch theme' : '切换主题'}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>

        <main className="main-content">

          {!extensionMode && (
            <section className="hero" aria-labelledby="hero-title">
              <div className="hero-copy">
                <span className="eyebrow">
                  <Braces size={15} aria-hidden="true" />
                  {t('app.workspace')}
                </span>
                <h1 id="hero-title">
                  {t('hero.title')}
                  <span>{t('hero.accent')}</span>
                </h1>
                <p>{t('hero.subtitle')}</p>
              </div>
              <div className="hero-stats" aria-label={t('features.aria')}>
                <div>
                  <strong>{quickToolCategories.length}</strong>
                  <span>{t('hero.quickCategories')}</span>
                </div>
                <div>
                  <strong>{formulaCategories.length}</strong>
                  <span>{t('hero.templateCategories')}</span>
                </div>
                <div>
                  <strong>{formulaTemplateCount}</strong>
                  <span>{t('hero.templates')}</span>
                </div>
                <div>
                  <strong>{quickToolCount}</strong>
                  <span>{t('hero.symbols')}</span>
                </div>
              </div>
            </section>
          )}

          <div className="workspace-grid">
            <section className="workspace-card input-card" aria-labelledby="input-title">
              <header className="card-header">
                <div className="card-title-group">
                  <span className="card-index">01</span>
                  <div>
                    <div className="card-title-line">
                      <h2 id="input-title">{t('input.title')}</h2>
                      <span>INPUT</span>
                    </div>
                    <p>{t('input.subtitle')}</p>
                  </div>
                </div>
                <span className="source-badge">
                  <span />
                  {t('source')}
                </span>
              </header>

              <div className="tool-tabs" role="tablist" aria-label={t('input.aria')}>
                {tabs.map(({ id, label, hint, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === id}
                    aria-controls={`tool-panel-${id}`}
                    className={`tool-tab ${activeTab === id ? 'tool-tab--active' : ''}`}
                    onClick={() => setActiveTab(id)}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>
                      <strong>{label}</strong>
                      <small>{hint}</small>
                    </span>
                  </button>
                ))}
              </div>

              <div
                className="tool-content"
                id={`tool-panel-${activeTab}`}
                role="tabpanel"
                aria-live="polite"
              >
                {activeTab === 'shortcuts' && <QuickToolsPanel onInsert={insertLatex} />}
                {activeTab === 'templates' && <FormulaTemplatesPanel onInsert={insertLatex} />}
                {activeTab === 'ocr' &&
                  (extensionMode ? (
                    <ImageRecognitionPanel
                      mineruMode={mineruMode}
                      mineruConfigured={mineruConfigured}
                      extensionMode
                      extensionSettings={extensionSettings}
                      onInsert={insertLatex}
                      onNotify={notify}
                    />
                  ) : (
                    <OcrExtensionNotice />
                  ))}
              </div>

              <div className="editor-toolbar">
                <div className="editor-toolbar__left">
                  <span className="toolbar-label">{t('toolbar.source')}</span>
                  <span className="toolbar-separator" />
                  <span className="toolbar-meta">
                    {t('toolbar.linesChars', {
                      lines: latex.split(/\r?\n/).length,
                      chars: latex.length,
                    })}
                  </span>
                </div>
                <div className="editor-toolbar__right">
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={clearEditor}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    {t('toolbar.clear')}
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--small"
                    onClick={() => void copyLatex()}
                  >
                    <Copy size={14} aria-hidden="true" />
                    {t('toolbar.copy')}
                  </button>
                </div>
              </div>

              <LatexEditor
                ref={editorRef}
                value={latex}
                onChange={setLatex}
                fontSize={editorFontSize}
              />
            </section>

            <PreviewPanel
              latex={latex}
              scale={previewScale}
              onScaleChange={setPreviewScale}
              onCopy={() => void copyLatex()}
            />
          </div>

          {!extensionMode && (
            <section className="feature-strip" aria-label={t('features.aria')}>
              <article className="feature-card">
                <span className="feature-number">01</span>
                <span className="feature-icon">
                  <Zap size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t('features.quickTitle')}</h3>
                  <p>{t('features.quickBody', { count: quickToolCount })}</p>
                </div>
              </article>
              <article className="feature-card">
                <span className="feature-number">02</span>
                <span className="feature-icon">
                  <BookOpen size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t('features.templateTitle')}</h3>
                  <p>{t('features.templateBody', { categories: categoryNames })}</p>
                </div>
              </article>
              <article className="feature-card">
                <span className="feature-number">03</span>
                <span className="feature-icon">
                  <ScanLine size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3>{t('features.ocrTitle')}</h3>
                  <p>{t('features.ocrBody')}</p>
                </div>
              </article>
            </section>
          )}
        </main>

        {!extensionMode && (
          <footer className="site-footer">
            <div>
              <span className="footer-mark">∑</span>
              <span>FormulaDock</span>
              <small>Focused formula workspace</small>
            </div>
            <p>{t('footer.agent')}</p>
          </footer>
        )}

        {preferencesOpen && (
          <PreferencesDialog
            initialLocale={locale}
            initialInterfaceScale={interfaceScale}
            initialFontSize={editorFontSize}
            extensionMode={extensionMode}
            onClose={() => setPreferencesOpen(false)}
            onSave={savePreferences}
            onOpenExtensionOptions={openFullExtensionSettings}
          />
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </I18nProvider>
  )
}
