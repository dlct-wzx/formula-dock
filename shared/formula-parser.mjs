import { strFromU8, unzipSync } from 'fflate'

const MAX_FORMULAS = 20

function asBytes(input) {
  if (input instanceof Uint8Array) return input
  return new Uint8Array(input)
}

function ascii(bytes) {
  return String.fromCharCode(...bytes)
}

function startsWithBytes(buffer, bytes) {
  if (buffer.length < bytes.length) return false
  return bytes.every((byte, index) => buffer[index] === byte)
}

export function detectImageType(input) {
  const buffer = asBytes(input)
  if (startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png'
  }
  if (startsWithBytes(buffer, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg'
  }
  if (
    buffer.length >= 12 &&
    ascii(buffer.subarray(0, 4)) === 'RIFF' &&
    ascii(buffer.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

export function extensionForMime(mimeType) {
  if (mimeType === 'image/png') return '.png'
  if (mimeType === 'image/jpeg') return '.jpg'
  if (mimeType === 'image/webp') return '.webp'
  return ''
}

export function normaliseImageFileName(fileName, mimeType) {
  const baseName = String(fileName || 'formula')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .slice(0, 120)
    .trim() || 'formula'
  const expectedExtension = extensionForMime(mimeType)
  const currentExtension = baseName.match(/\.[A-Za-z0-9]+$/)?.[0]?.toLowerCase() || ''
  return currentExtension ? baseName : `${baseName}${expectedExtension}`
}

export function stripMathDelimiters(input, displayMode = true) {
  let text = String(input ?? '').trim()
  if (!text) return { latex: '', displayMode }

  text = text
    .replace(/^```(?:latex|tex|math)?\s*/i, '')
    .replace(/```$/i, '')
    .trim()

  const pairedWrappers = [
    [/^\$\$([\s\S]*)\$\$$/, true],
    [/^\\\[([\s\S]*)\\\]$/, true],
    [/^\\\(([\s\S]*)\\\)$/, false],
    [/^\$([^$]+)\$$/, false],
  ]

  for (const [pattern, isDisplay] of pairedWrappers) {
    const match = text.match(pattern)
    if (!match) continue
    text = match[1].trim()
    displayMode = isDisplay
    break
  }

  const equationWrapper = text.match(
    /^\\begin\{(equation\*?|displaymath)\}([\s\S]*)\\end\{\1\}$/,
  )
  if (equationWrapper) {
    text = equationWrapper[2].trim()
    displayMode = true
  }

  const alignedWrapper = text.match(/^\\begin\{(align\*?|gather\*?)\}([\s\S]*)\\end\{\1\}$/)
  if (alignedWrapper) {
    text = `\\begin{aligned}${alignedWrapper[2]}\\end{aligned}`
    displayMode = true
  }

  text = text
    .replace(/\\label\{[^{}]*\}/g, '')
    .replace(/\\tag\{[^{}]*\}/g, '')
    .trim()

  return { latex: text, displayMode }
}

function candidateFromEquationObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const type = String(value.type ?? value.category ?? '').toLowerCase()
  const isEquation =
    type.includes('equation') ||
    type === 'formula' ||
    type === 'math' ||
    type.includes('formula')

  if (!isEquation) return null

  for (const key of ['latex', 'math', 'text', 'content', 'value']) {
    const raw = value[key]
    if (typeof raw !== 'string' || !raw.trim()) continue
    const normalised = stripMathDelimiters(raw, Boolean(value.display || value.display_mode))
    if (normalised.latex) return normalised
  }
  return null
}

function collectStringValues(input, output = [], visited = new Set()) {
  if (typeof input === 'string') {
    output.push(input)
    return output
  }
  if (!input || typeof input !== 'object' || visited.has(input)) return output
  visited.add(input)
  if (Array.isArray(input)) {
    for (const item of input) collectStringValues(item, output, visited)
  } else {
    for (const value of Object.values(input)) collectStringValues(value, output, visited)
  }
  return output
}

function collectEquationObjects(input, output = [], visited = new Set()) {
  if (!input || visited.has(input)) return output
  if (typeof input === 'object') visited.add(input)

  const direct = candidateFromEquationObject(input)
  if (direct) output.push(direct)

  if (Array.isArray(input)) {
    for (const item of input) collectEquationObjects(item, output, visited)
  } else if (typeof input === 'object') {
    for (const value of Object.values(input)) collectEquationObjects(value, output, visited)
  }
  return output
}

export function extractFormulasFromMarkdown(markdown) {
  const source = String(markdown ?? '')
  if (!source.trim()) return []

  const patterns = [
    { regex: /\$\$([\s\S]*?)\$\$/g, displayMode: true },
    { regex: /\\\[([\s\S]*?)\\\]/g, displayMode: true },
    {
      regex: /\\begin\{(equation\*?|displaymath|align\*?|gather\*?)\}([\s\S]*?)\\end\{\1\}/g,
      displayMode: true,
      useWholeMatch: true,
    },
    { regex: /\\\(([\s\S]*?)\\\)/g, displayMode: false },
    { regex: /(^|[^$\\])\$([^$\n]+?)\$(?!\$)/g, displayMode: false, captureGroup: 2 },
  ]

  const found = []
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern.regex)) {
      const raw = pattern.useWholeMatch ? match[0] : match[pattern.captureGroup ?? 1]
      const normalised = stripMathDelimiters(raw, pattern.displayMode)
      if (!normalised.latex) continue
      found.push({ ...normalised, index: match.index ?? 0 })
    }
  }

  found.sort((left, right) => left.index - right.index)
  return extractDeduplicate(found).slice(0, MAX_FORMULAS)
}

function findFormulaFiles(files) {
  const names = Object.keys(files)
  const jsonFiles = names
    .filter((name) => /content_list\.json$/i.test(name))
    .sort((left, right) => left.length - right.length)
  const markdownFiles = names
    .filter((name) => /\.md$/i.test(name) && !/readme\.md$/i.test(name))
    .sort((left, right) => left.length - right.length)
  return { jsonFiles, markdownFiles }
}

export function processMineruZip(input) {
  let files
  try {
    files = unzipSync(asBytes(input))
  } catch {
    throw new Error('MinerU 返回的结果压缩包无法解压。')
  }

  const { jsonFiles, markdownFiles } = findFormulaFiles(files)
  for (const fileName of jsonFiles) {
    try {
      const parsed = JSON.parse(strFromU8(files[fileName]))
      const stringFormulas = collectStringValues(parsed).flatMap((value) =>
        extractFormulasFromMarkdown(value),
      )
      const equationObjects = collectEquationObjects(parsed)
      const deduped = extractDeduplicate([...equationObjects, ...stringFormulas])
      if (deduped.length) return { formulas: deduped, source: fileName }
    } catch {
      // Try the next output file.
    }
  }

  for (const fileName of markdownFiles) {
    const markdown = strFromU8(files[fileName])
    const formulas = extractFormulasFromMarkdown(markdown)
    if (formulas.length) return { formulas, source: fileName }

    const whole = stripMathDelimiters(markdown, true)
    if (whole.latex && /\\[A-Za-z]+|[_^{}]/.test(whole.latex)) {
      return { formulas: [whole], source: fileName }
    }
  }

  return { formulas: [], source: null }
}

function extractDeduplicate(formulas) {
  const seen = new Set()
  const output = []
  for (const formula of formulas) {
    const latex = String(formula?.latex ?? '').trim()
    if (!latex) continue
    const key = latex.replace(/\s+/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ latex, displayMode: formula.displayMode !== false })
    if (output.length >= MAX_FORMULAS) break
  }
  return output
}

export function toFormulaResponse(formulas) {
  return formulas.map((formula, index) => ({
    id: `formula-${index + 1}`,
    latex: formula.latex,
    displayMode: formula.displayMode,
  }))
}
