import { useState } from 'react'
import {
  AlertCircle,
  ArrowUpRight,
  LoaderCircle,
  PanelRight,
  Settings2,
  ShieldCheck,
} from 'lucide-react'
import {
  INSERT_FORMAT_LABELS,
  openExtensionOptions,
  type ExtensionSettings,
} from '../lib/extension/settings'
import { insertLatexIntoActivePage } from '../lib/extension/runtime'
import type { ToastTone } from '../types'

interface ExtensionActionBarProps {
  latex: string
  settings: ExtensionSettings | null
  onNotify: (message: string, tone?: ToastTone) => void
}

export function ExtensionActionBar({ latex, settings, onNotify }: ExtensionActionBarProps) {
  const [inserting, setInserting] = useState(false)

  const insertIntoPage = async () => {
    if (!latex.trim()) {
      onNotify('编辑器还是空的，先输入一个公式。', 'info')
      return
    }
    if (!settings) {
      onNotify('插件设置正在加载，请稍后再试。', 'info')
      return
    }

    setInserting(true)
    try {
      const result = await insertLatexIntoActivePage(latex, settings)
      onNotify(result.message || '公式已插入当前网页。', 'success')
    } catch (error) {
      onNotify(error instanceof Error ? error.message : '插入当前网页失败。', 'error')
    } finally {
      setInserting(false)
    }
  }

  const openSettings = async () => {
    try {
      await openExtensionOptions()
    } catch (error) {
      onNotify(error instanceof Error ? error.message : '无法打开插件设置。', 'error')
    }
  }

  return (
    <section className="extension-action-bar" aria-label="浏览器扩展操作">
      <div className="extension-action-copy">
        <span className="extension-action-icon">
          <PanelRight size={17} aria-hidden="true" />
        </span>
        <div>
          <span className="extension-action-kicker">BROWSER EXTENSION</span>
          <strong>把 LaTeX 插入当前网页</strong>
          <small>
            {settings?.mineruToken ? (
              <>
                <ShieldCheck size={12} aria-hidden="true" />
                MinerU 已配置
              </>
            ) : (
              <>
                <AlertCircle size={12} aria-hidden="true" />
                尚未配置 MinerU Token
              </>
            )}
            <span>·</span>
            {settings ? INSERT_FORMAT_LABELS[settings.insertFormat] : '读取设置中'}
          </small>
        </div>
      </div>

      <div className="extension-action-buttons">
        <button type="button" className="button button--ghost button--small" onClick={openSettings}>
          <Settings2 size={14} aria-hidden="true" />
          设置
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
          {inserting ? '插入中' : '插入网页'}
        </button>
      </div>
    </section>
  )
}
