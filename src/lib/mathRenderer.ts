import mathJaxComponentUrl from 'mathjax/tex-svg.js?url'

export type MathRenderer = 'katex' | 'mathjax'

export const DEFAULT_MATH_RENDERER: MathRenderer = 'katex'

export function normaliseMathRenderer(value: unknown): MathRenderer {
  return value === 'mathjax' ? 'mathjax' : DEFAULT_MATH_RENDERER
}

interface MathJaxAdaptor {
  serializeXML(node: unknown): string
}

interface MathJaxGlobal {
  startup?: {
    adaptor?: MathJaxAdaptor
    promise?: Promise<void>
    typeset?: boolean
  }
  tex?: {
    macros?: Record<string, string>
  }
  svg?: {
    fontCache?: string
  }
  loader?: {
    paths?: Record<string, string>
  }
  options?: {
    enableMenu?: boolean
    menuOptions?: {
      settings?: {
        enrich?: boolean
        speech?: boolean
        braille?: boolean
      }
    }
    enableEnrichment?: boolean
    enableSpeech?: boolean
    enableBraille?: boolean
  }
  tex2svgPromise?(latex: string, options?: { display?: boolean }): Promise<unknown>
}

interface ReadyMathJax extends MathJaxGlobal {
  startup: {
    adaptor: MathJaxAdaptor
    promise: Promise<void>
  }
  tex2svgPromise(latex: string, options?: { display?: boolean }): Promise<unknown>
}

declare global {
  interface Window {
    MathJax?: MathJaxGlobal
  }
}

const SCRIPT_SELECTOR = 'script[data-formuladock-mathjax]'
const MATHJAX_MENU_STORAGE_KEY = 'MathJax-Menu-Settings'
let mathJaxLoader: Promise<ReadyMathJax> | null = null

function isReadyMathJax(value: MathJaxGlobal | undefined): value is ReadyMathJax {
  return Boolean(value?.startup?.promise && value.tex2svgPromise)
}

function prepareMathJaxMenuSettings(): () => void {
  let original: string | null = null
  try {
    original = localStorage.getItem(MATHJAX_MENU_STORAGE_KEY)
    const current = original ? (JSON.parse(original) as Record<string, unknown>) : {}
    localStorage.setItem(
      MATHJAX_MENU_STORAGE_KEY,
      JSON.stringify({
        ...current,
        enrich: false,
        collapsible: false,
        speech: false,
        braille: false,
        assistiveMml: false,
        inTabOrder: false,
      }),
    )
  } catch {
    // Rendering can continue with MathJax defaults when storage is unavailable.
  }

  let restored = false
  return () => {
    if (restored) return
    restored = true
    try {
      if (original === null) localStorage.removeItem(MATHJAX_MENU_STORAGE_KEY)
      else localStorage.setItem(MATHJAX_MENU_STORAGE_KEY, original)
    } catch {
      // Ignore restoration failures; the in-memory MathJax settings are already loaded.
    }
  }
}

function loadMathJax(): Promise<ReadyMathJax> {
  if (isReadyMathJax(window.MathJax)) return Promise.resolve(window.MathJax)
  if (mathJaxLoader) return mathJaxLoader

  mathJaxLoader = new Promise<ReadyMathJax>((resolve, reject) => {
    const restoreMenuSettings = prepareMathJaxMenuSettings()
    const previous = document.querySelector<HTMLScriptElement>(SCRIPT_SELECTOR)
    previous?.remove()

    const mathJaxFontBase = new URL('mathjax-fonts/', document.baseURI).href.replace(/\/$/, '')
    window.MathJax = {
      loader: {
        paths: {
          'mathjax-newcm': mathJaxFontBase,
        },
      },
      startup: {
        typeset: false,
      },
      tex: {
        macros: {
          RR: '\\mathbb{R}',
          NN: '\\mathbb{N}',
          ZZ: '\\mathbb{Z}',
        },
      },
      svg: {
        fontCache: 'local',
      },
      options: {
        enableMenu: false,
        menuOptions: {
          settings: {
            enrich: false,
            speech: false,
            braille: false,
          },
        },
        enableEnrichment: false,
        enableSpeech: false,
        enableBraille: false,
      },
    }

    const script = document.createElement('script')
    script.dataset.formuladockMathjax = 'local'
    script.src = mathJaxComponentUrl
    script.async = true

    const fail = () => {
      restoreMenuSettings()
      script.remove()
      mathJaxLoader = null
      reject(new Error('Unable to load the local MathJax component.'))
    }

    script.addEventListener(
      'load',
      () => {
        const mathJax = window.MathJax
        if (!isReadyMathJax(mathJax)) {
          fail()
          return
        }
        void mathJax.startup.promise.then(() => {
          restoreMenuSettings()
          resolve(mathJax)
        }, fail)
      },
      { once: true },
    )
    script.addEventListener('error', fail, { once: true })
    document.head.appendChild(script)
  })

  return mathJaxLoader
}

export async function renderMathJax(latex: string, displayMode = false): Promise<string> {
  const mathJax = await loadMathJax()
  const node = await mathJax.tex2svgPromise(latex, { display: displayMode })
  return mathJax.startup.adaptor.serializeXML(node)
}

export function escapeLatexHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
