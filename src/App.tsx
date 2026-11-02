import { useCallback, useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  Braces,
  Copy,
  Moon,
  ScanLine,
  Server,
  Sparkles,
  Sun,
  Trash2,
  Zap,
} from 'lucide-react'
import { LatexEditor, type LatexEditorHandle } from './components/LatexEditor'
import { QuickToolsPanel } from './components/QuickToolsPanel'
import { FormulaTemplatesPanel } from './components/FormulaTemplatesPanel'
import { ImageRecognitionPanel } from './components/ImageRecognitionPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { Toast, type ToastState } from './components/Toast'
import { ExtensionActionBar } from './components/ExtensionActionBar'
import { formulaCategories, formulaTemplateCount } from './data/formulaTemplates'
import { quickToolCategories, quickToolCount } from './data/quickTools'
import type { ApiHealth, ToastTone, ToolTab } from './types'
import { isExtensionContext } from './lib/extension/settings'
import { useExtensionSettings } from './lib/extension/useExtensionSettings'

const TABS: Array<{ id: ToolTab; label: string; hint: string; icon: typeof Zap }> = [
  { id: 'shortcuts', label: '快捷工具', hint: `${quickToolCount} 个符号`, icon: Zap },
  { id: 'templates', label: '公式模板', hint: `${formulaTemplateCount} 个模板`, icon: BookOpen },
  { id: 'ocr', label: '图片识别', hint: 'MinerU OCR', icon: ScanLine },
]

function initialTheme(): 'light' | 'dark' {
  const stored = localStorage.getItem('latexlive-studio:theme')
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
  const [health, setHealth] = useState<ApiHealth | null>(null)
  const [apiOffline, setApiOffline] = useState(false)
  const extensionMode = isExtensionContext()
  const { settings: extensionSettings } = useExtensionSettings(extensionMode)

  const notify = useCallback((message: string, tone: ToastTone = 'info') => {
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    setToast({ id: Date.now(), message, tone })
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3_200)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem('latexlive-studio:theme', theme)
    } catch {
      // Theme persistence is optional.
    }
  }, [theme])

  useEffect(() => {
    if (extensionMode) return
    let active = true
    fetch('/api/health')
      .then(async (response) => {
        if (!response.ok) throw new Error('health request failed')
        return (await response.json()) as ApiHealth
      })
      .then((payload) => {
        if (!active) return
        setHealth(payload)
        setApiOffline(false)
      })
      .catch(() => {
        if (active) setApiOffline(true)
      })
    return () => {
      active = false
    }
  }, [extensionMode])

  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    },
    [],
  )

  const insertLatex = (value: string, cursorBack = 0) => {
    editorRef.current?.insertText(value, cursorBack)
    notify('已插入到编辑器光标位置。', 'success')
  }

  const copyLatex = async () => {
    if (!latex.trim()) {
      notify('编辑器还是空的，先输入一个公式。', 'info')
      return
    }
    try {
      await navigator.clipboard.writeText(latex)
      notify('LaTeX 源码已复制。', 'success')
    } catch {
      notify('浏览器未允许写入剪贴板。', 'error')
    }
  }

  const clearEditor = () => {
    if (!latex) return
    setLatex('')
    editorRef.current?.focus()
    notify('编辑器已清空。', 'info')
  }

  const extensionMineruReady = Boolean(extensionSettings?.mineruToken)
  const mineruMode = extensionMode
    ? extensionMineruReady
      ? 'live'
      : 'mock'
    : health?.mineru.mode || (apiOffline ? undefined : 'mock')
  const mineruConfigured = extensionMode ? extensionMineruReady : health?.mineru.configured
  const statusText = extensionMode
    ? extensionMineruReady
      ? 'MINERU LIVE'
      : 'MINERU SETUP'
    : apiOffline
      ? 'API OFFLINE'
      : mineruMode === 'live'
        ? 'MINERU LIVE'
        : 'MINERU MOCK'
  const statusTitle = extensionMode
    ? extensionMineruReady
      ? 'MinerU Token 已配置，直接由扩展调用'
      : '请打开扩展设置配置 MinerU Token'
    : apiOffline
      ? 'API 服务未启动'
      : `MinerU: ${mineruMode || 'loading'}`

  return (
    <div className={`app ${extensionMode ? 'app--extension' : ''}`} id="top">
      <header className="site-header">
        <a className="brand" href={extensionMode ? '#top' : '/'} aria-label="LaTeX Studio 首页">
          <span className="brand-mark">∑</span>
          <span className="brand-copy">
            <strong>
              LaTeX <em>Studio</em>
            </strong>
            <small>公式编辑 · 模板 · 图片识别</small>
          </span>
        </a>

        <div className="header-actions">
          {!extensionMode && (
            <span className="agent-chip">
              <Sparkles size={13} aria-hidden="true" />
              Agent-maintained
            </span>
          )}
          <span
            className={`api-status ${
              apiOffline ? 'api-status--offline' : mineruMode === 'live' ? 'api-status--live' : ''
            }`}
            title={statusTitle}
          >
            <Server size={14} aria-hidden="true" />
            {statusText}
          </span>
          <button
            type="button"
            className="theme-button"
            onClick={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
            aria-label={theme === 'light' ? '切换到深色主题' : '切换到浅色主题'}
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        {extensionMode && (
          <ExtensionActionBar
            latex={latex}
            settings={extensionSettings}
            onNotify={notify}
          />
        )}

        {!extensionMode && (
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">
              <Braces size={15} aria-hidden="true" />
              FORMULA WORKSPACE / 2026
            </span>
            <h1 id="hero-title">
              公式，不止于<span>输入。</span>
            </h1>
            <p>
              快捷符号、可检索模板与 MinerU 图片识别，在一个专注的公式工作台里完成。
            </p>
          </div>
          <div className="hero-stats" aria-label="项目功能统计">
            <div>
              <strong>{quickToolCategories.length}</strong>
              <span>快捷分类</span>
            </div>
            <div>
              <strong>{formulaCategories.length}</strong>
              <span>模板分类</span>
            </div>
            <div>
              <strong>{formulaTemplateCount}</strong>
              <span>公式模板</span>
            </div>
            <div>
              <strong>{quickToolCount}</strong>
              <span>快捷符号</span>
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
                    <h2 id="input-title">输入区域</h2>
                    <span>INPUT</span>
                  </div>
                  <p>选择工具、模板或直接编写源码</p>
                </div>
              </div>
              <span className="source-badge">
                <span />
                SOURCE
              </span>
            </header>

            <div className="tool-tabs" role="tablist" aria-label="输入工具">
              {TABS.map(({ id, label, hint, icon: Icon }) => (
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
              {activeTab === 'ocr' && (
                <ImageRecognitionPanel
                  mineruMode={mineruMode}
                  mineruConfigured={mineruConfigured}
                  extensionMode={extensionMode}
                  extensionSettings={extensionSettings}
                  onInsert={insertLatex}
                  onNotify={notify}
                />
              )}
            </div>

            <div className="editor-toolbar">
              <div className="editor-toolbar__left">
                <span className="toolbar-label">LaTeX SOURCE</span>
                <span className="toolbar-separator" />
                <span className="toolbar-meta">
                  {latex.split(/\r?\n/).length} lines · {latex.length} chars
                </span>
              </div>
              <div className="editor-toolbar__right">
                <button type="button" className="button button--ghost button--small" onClick={clearEditor}>
                  <Trash2 size={14} aria-hidden="true" />
                  清空
                </button>
                <button type="button" className="button button--ghost button--small" onClick={copyLatex}>
                  <Copy size={14} aria-hidden="true" />
                  复制
                </button>
              </div>
            </div>

            <LatexEditor ref={editorRef} value={latex} onChange={setLatex} />
          </section>

          <PreviewPanel
            latex={latex}
            scale={previewScale}
            onScaleChange={setPreviewScale}
            onCopy={copyLatex}
          />
        </div>

        {!extensionMode && (
        <section className="feature-strip" aria-label="功能概览">
          <article className="feature-card">
            <span className="feature-number">01</span>
            <span className="feature-icon">
              <Zap size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>快捷工具</h3>
              <p>按分类浏览 {quickToolCount} 个常用符号与结构，点击即插入光标位置。</p>
            </div>
          </article>
          <article className="feature-card">
            <span className="feature-number">02</span>
            <span className="feature-icon">
              <BookOpen size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>公式模板</h3>
              <p>覆盖 {formulaCategories.map((category) => category.title).join('、')} 等分类。</p>
            </div>
          </article>
          <article className="feature-card">
            <span className="feature-number">03</span>
            <span className="feature-icon">
              <ScanLine size={18} aria-hidden="true" />
            </span>
            <div>
              <h3>MinerU 图片识别</h3>
              <p>支持上传、拖拽与剪贴板粘贴，密钥仅在服务端使用。</p>
            </div>
          </article>
        </section>
        )}
      </main>

      {!extensionMode && (
      <footer className="site-footer">
        <div>
          <span className="footer-mark">∑</span>
          <span>LaTeX Studio</span>
          <small>Focused formula workspace</small>
        </div>
        <p>
          Agent-led project · 工作流记录在 <code>.agents/</code> · 2026
        </p>
      </footer>
      )}

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
