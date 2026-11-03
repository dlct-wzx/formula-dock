import katex from 'katex'
import { escapeLatexHtml } from './mathRenderer'

export function renderLatex(latex: string, displayMode = false): string {
  if (!latex.trim()) return ''
  try {
    return katex.renderToString(latex, {
      displayMode,
      throwOnError: false,
      strict: 'ignore',
      output: 'html',
      trust: false,
      macros: {
        '\\RR': '\\mathbb{R}',
        '\\NN': '\\mathbb{N}',
        '\\ZZ': '\\mathbb{Z}',
      },
    })
  } catch {
    return `<span class="math-render-error">${escapeLatexHtml(latex)}</span>`
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
