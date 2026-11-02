import { useMemo } from 'react'
import { renderLatex } from '../lib/latex'

interface MathMarkupProps {
  latex: string
  displayMode?: boolean
  className?: string
}

export function MathMarkup({ latex, displayMode = false, className = '' }: MathMarkupProps) {
  const html = useMemo(() => renderLatex(latex, displayMode), [displayMode, latex])

  if (!html) return null
  return (
    <span
      className={`math-markup ${displayMode ? 'math-markup--display' : ''} ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function InlineMath({ latex, className }: { latex: string; className?: string }) {
  return <MathMarkup latex={latex} className={className} />
}

export function DisplayMath({ latex, className }: { latex: string; className?: string }) {
  return <MathMarkup latex={latex} displayMode className={className} />
}
