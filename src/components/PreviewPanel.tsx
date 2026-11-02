import { Copy, Check, Minus, Plus, Gauge, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import { DisplayMath } from './MathMarkup'

interface PreviewPanelProps {
  latex: string
  scale: number
  onScaleChange: (scale: number) => void
  onCopy: () => void
}

export function PreviewPanel({ latex, scale, onScaleChange, onCopy }: PreviewPanelProps) {
  const decrease = () => onScaleChange(Math.max(0.7, Math.round((scale - 0.1) * 10) / 10))
  const increase = () => onScaleChange(Math.min(1.5, Math.round((scale + 0.1) * 10) / 10))

  return (
    <section className="workspace-card output-card" aria-labelledby="output-title">
      <header className="card-header">
        <div className="card-title-group">
          <span className="card-index">02</span>
          <div>
            <div className="card-title-line">
              <h2 id="output-title">输出区域</h2>
              <span>OUTPUT</span>
            </div>
            <p>KaTeX 实时渲染预览</p>
          </div>
        </div>
        <div className="preview-controls">
          <div className="scale-control" aria-label="预览缩放">
            <button type="button" className="icon-button icon-button--small" onClick={decrease} aria-label="缩小预览">
              <Minus size={14} aria-hidden="true" />
            </button>
            <span>{Math.round(scale * 100)}%</span>
            <button type="button" className="icon-button icon-button--small" onClick={increase} aria-label="放大预览">
              <Plus size={14} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="button button--ghost button--small" onClick={onCopy}>
            <Copy size={14} aria-hidden="true" />
            复制 LaTeX
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
            <h3>等待一个公式</h3>
            <p>从左侧选择模板或快捷符号，也可以直接输入 LaTeX。</p>
            <div className="preview-empty__hint">
              <Check size={14} aria-hidden="true" />
              输入、编辑和预览只发生在当前浏览器
            </div>
          </div>
        )}
      </div>

      <footer className="output-footer">
        <div className="output-footer__item">
          <Gauge size={15} aria-hidden="true" />
          <span>实时渲染</span>
          <strong>{latex.trim() ? 'READY' : 'IDLE'}</strong>
        </div>
        <div className="output-footer__item">
          <ShieldCheck size={15} aria-hidden="true" />
          <span>编辑数据</span>
          <strong>LOCAL</strong>
        </div>
        <div className="output-footer__chars">
          <span>{latex.length}</span> characters
        </div>
      </footer>
    </section>
  )
}
