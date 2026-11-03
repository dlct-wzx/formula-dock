import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { renderLatex } from '../lib/latex'
import { escapeLatexHtml, renderMathJax } from '../lib/mathRenderer'
import { useMathRenderer } from './MathRendererProvider'

interface MathMarkupProps {
  latex: string
  displayMode?: boolean
  className?: string
}

type MathJaxState =
  | { status: 'idle'; html: '' }
  | { status: 'loading'; html: '' }
  | { status: 'ready'; html: string }
  | { status: 'error'; html: '' }

const IDLE_MATHJAX_STATE: MathJaxState = { status: 'idle', html: '' }

export function MathMarkup({ latex, displayMode = false, className = '' }: MathMarkupProps) {
  const renderer = useMathRenderer()
  const requestRef = useRef(0)
  const [mathJaxState, setMathJaxState] = useState<MathJaxState>(IDLE_MATHJAX_STATE)
  const katexHtml = useMemo(
    () => (renderer === 'katex' ? renderLatex(latex, displayMode) : ''),
    [displayMode, latex, renderer],
  )

  useEffect(() => {
    if (renderer !== 'mathjax' || !latex.trim()) {
      setMathJaxState(IDLE_MATHJAX_STATE)
      return
    }

    const requestId = ++requestRef.current
    setMathJaxState({ status: 'loading', html: '' })
    void renderMathJax(latex, displayMode)
      .then((html) => {
        if (requestRef.current === requestId) setMathJaxState({ status: 'ready', html })
      })
      .catch(() => {
        if (requestRef.current === requestId) setMathJaxState({ status: 'error', html: '' })
      })

    return () => {
      if (requestRef.current === requestId) requestRef.current += 1
    }
  }, [displayMode, latex, renderer])

  if (!latex.trim()) return null

  const wrapperClassName =
    `math-markup ${displayMode ? 'math-markup--display' : ''} ${className}`.trim()

  if (renderer === 'katex') {
    return (
      <span
        className={wrapperClassName}
        role="img"
        aria-label={latex}
        data-math-renderer="katex"
        data-math-status="ready"
        dangerouslySetInnerHTML={{ __html: katexHtml }}
      />
    )
  }

  if (mathJaxState.status === 'ready') {
    return (
      <span
        className={wrapperClassName}
        role="img"
        aria-label={latex}
        data-math-renderer="mathjax"
        data-math-status="ready"
      >
        <span
          className="mathjax-rendered"
          data-math-renderer="mathjax"
          dangerouslySetInnerHTML={{ __html: mathJaxState.html }}
        />
      </span>
    )
  }

  const isError = mathJaxState.status === 'error'
  return (
    <span
      className={wrapperClassName}
      role="img"
      aria-label={latex}
      data-math-renderer="mathjax"
      data-math-status={mathJaxState.status}
      aria-busy={mathJaxState.status === 'loading' ? 'true' : undefined}
    >
      <span className={isError ? 'math-render-error' : 'math-render-placeholder'}>
        {escapeLatexHtml(latex)}
      </span>
    </span>
  )
}

export function FittedMath({ latex, className = '' }: { latex: string; className?: string }) {
  const hostRef = useRef<HTMLSpanElement>(null)
  const contentRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const host = hostRef.current
    const content = contentRef.current
    if (!host || !content) return

    let frame = 0
    const fit = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const math = content.firstElementChild
        const target =
          content.querySelector<HTMLElement>('mjx-container') ??
          content.querySelector<HTMLElement>('.katex') ??
          content.querySelector<HTMLElement>('.katex-display') ??
          content.firstElementChild
        if (!(math instanceof HTMLElement) || !(target instanceof HTMLElement)) return

        const availableWidth = host.clientWidth
        const availableHeight = host.clientHeight
        if (availableWidth <= 0 || availableHeight <= 0) return

        content.style.transform = 'none'
        const targetRect = target.getBoundingClientRect()
        const contentRect = math.getBoundingClientRect()
        const naturalWidth = Math.max(targetRect.width, target.scrollWidth, contentRect.width, 1)
        const naturalHeight = Math.max(targetRect.height, target.scrollHeight, contentRect.height, 1)
        const scale = Math.min(1, (availableWidth - 2) / naturalWidth, (availableHeight - 2) / naturalHeight)

        content.style.transform = `scale(${scale.toFixed(4)})`
        content.style.visibility = 'visible'
        host.dataset.mathScale = scale.toFixed(3)
      })
    }

    fit()
    const resizeObserver = new ResizeObserver(fit)
    resizeObserver.observe(host)
    resizeObserver.observe(content)
    const mutationObserver = new MutationObserver(fit)
    mutationObserver.observe(content, {
      attributes: true,
      attributeFilter: ['data-math-status'],
      childList: true,
      subtree: true,
    })
    window.addEventListener('resize', fit)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [latex])

  return (
    <span ref={hostRef} className={`fitted-math ${className}`.trim()}>
      <span ref={contentRef} className="fitted-math__content">
        <InlineMath latex={latex} />
      </span>
    </span>
  )
}

export function InlineMath({ latex, className }: { latex: string; className?: string }) {
  return <MathMarkup latex={latex} className={className} />
}

export function DisplayMath({ latex, className }: { latex: string; className?: string }) {
  return <MathMarkup latex={latex} displayMode className={className} />
}
