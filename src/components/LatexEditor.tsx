import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react'
import { useI18n } from '../i18n/I18nContext'
import type { LatexEnvironment } from '../lib/latexEnvironments'

export interface LatexEditorHandle {
  insertText: (text: string, cursorBack?: number) => void
  wrapEnvironment: (environment: LatexEnvironment) => void
  focus: () => void
}

function unwrapEnvironment(text: string): string | null {
  const match = text.match(
    /^\s*\\begin\{([A-Za-z*]+)\}(?:\{[^}]*\})?[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*\\end\{\1\}\s*$/,
  )
  if (!match) return null
  return match[2]
    .split('\n')
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n')
}

interface LatexEditorProps {
  value: string
  onChange: (value: string) => void
  fontSize: number
}

export const LatexEditor = forwardRef<LatexEditorHandle, LatexEditorProps>(
  function LatexEditor({ value, onChange, fontSize }, ref) {
    const { t } = useI18n()
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const insertText = (text: string, cursorBack = 0) => {
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? value.length
      const end = textarea?.selectionEnd ?? value.length
      const nextValue = value.slice(0, start) + text + value.slice(end)
      const nextCursor = Math.max(start, start + text.length - cursorBack)

      onChange(nextValue)
      requestAnimationFrame(() => {
        textarea?.focus()
        textarea?.setSelectionRange(nextCursor, nextCursor)
      })
    }

    const wrapEnvironment = (environment: LatexEnvironment) => {
      const textarea = textareaRef.current
      const start = textarea?.selectionStart ?? value.length
      const end = textarea?.selectionEnd ?? start
      const selected = value.slice(start, end)

      if (environment === 'none') {
        const candidate = selected || value
        const unwrapped = unwrapEnvironment(candidate)
        if (unwrapped === null) {
          textarea?.focus()
          return
        }
        const nextValue = selected
          ? value.slice(0, start) + unwrapped + value.slice(end)
          : unwrapped
        const nextCursor = selected ? start + unwrapped.length : Math.min(start, unwrapped.length)
        onChange(nextValue)
        requestAnimationFrame(() => {
          textarea?.focus()
          textarea?.setSelectionRange(nextCursor, nextCursor)
        })
        return
      }

      const opening = environment === 'array' ? '\\begin{array}{c}' : `\\begin{${environment}}`
      const closing = `\\end{${environment}}`
      const body = selected
        ? selected
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n')
        : '  '
      const replacement = `${opening}\n${body}\n${closing}`
      const contentStart = start + opening.length + 1
      const contentEnd = contentStart + body.length
      onChange(value.slice(0, start) + replacement + value.slice(end))
      requestAnimationFrame(() => {
        textarea?.focus()
        textarea?.setSelectionRange(contentStart, contentEnd)
      })
    }

    useImperativeHandle(ref, () => ({
      insertText,
      wrapEnvironment,
      focus: () => textareaRef.current?.focus(),
    }))

    const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
      onChange(event.target.value)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Tab') return
      event.preventDefault()
      insertText('  ')
    }

    return (
      <div className="editor-shell">
        <div className="editor-gutter" aria-hidden="true">
          <span>01</span>
          <span>02</span>
          <span>03</span>
          <span>04</span>
          <span>05</span>
          <span>06</span>
        </div>
        <textarea
          ref={textareaRef}
          className="latex-editor"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={t('editor.placeholder')}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={t('editor.aria')}
          style={{ fontSize: `${fontSize}px` }}
        />
        <div className="editor-meta" aria-hidden="true">
          <span>LaTeX / UTF-8</span>
          <span>{value.length} chars</span>
        </div>
      </div>
    )
  },
)
