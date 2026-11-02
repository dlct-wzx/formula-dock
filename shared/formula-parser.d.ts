export interface ParsedFormula {
  latex: string
  displayMode: boolean
}

export interface ParsedFormulaResult {
  formulas: ParsedFormula[]
  source: string | null
}

export interface FormulaResponseItem extends ParsedFormula {
  id: string
}

export function detectImageType(input: ArrayBuffer | Uint8Array): string | null
export function extensionForMime(mimeType: string): string
export function normaliseImageFileName(fileName: string, mimeType: string): string
export function stripMathDelimiters(
  input: unknown,
  displayMode?: boolean,
): ParsedFormula
export function extractFormulasFromMarkdown(markdown: unknown): ParsedFormula[]
export function processMineruZip(
  input: ArrayBuffer | Uint8Array,
): ParsedFormulaResult
export function toFormulaResponse(formulas: ParsedFormula[]): FormulaResponseItem[]
