import test from 'node:test'
import assert from 'node:assert/strict'
import { zipSync, strToU8 } from 'fflate'
import {
  ImageValidationError,
  detectImageType,
  extractFormulasFromMarkdown,
  processMineruZip,
  stripMathDelimiters,
  validateImage,
} from './ocr-utils.mjs'

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
])

test('detects a PNG magic signature', () => {
  assert.equal(detectImageType(PNG_BYTES), 'image/png')
})

test('rejects misleading image content', () => {
  assert.throws(
    () =>
      validateImage({
        buffer: Buffer.from('not an image'),
        contentType: 'image/png',
        fileName: 'fake.png',
      }),
    ImageValidationError,
  )
})

test('normalises wrapped LaTeX', () => {
  const result = stripMathDelimiters(String.raw`$$\frac{a}{b}$$`)
  assert.equal(result.latex, String.raw`\frac{a}{b}`)
  assert.equal(result.displayMode, true)
})

test('extracts block and inline formulas in source order', () => {
  const markdown = String.raw`First $$x^2+y^2=1$$ then \(\sin x\) and $a+b$.`
  const formulas = extractFormulasFromMarkdown(markdown)
  assert.deepEqual(
    formulas.map((formula) => formula.latex),
    [String.raw`x^2+y^2=1`, String.raw`\sin x`, String.raw`a+b`],
  )
})

test('unpacks MinerU content_list output', () => {
  const payload = [
    {
      type: 'equation',
      text: String.raw`$$\int_0^1 x^2\,\mathrm{d}x=\frac{1}{3}$$`,
      page_idx: 0,
    },
  ]
  const zip = zipSync({
    'result_content_list.json': strToU8(JSON.stringify(payload)),
    'full.md': strToU8('ignored'),
  })
  const result = processMineruZip(Buffer.from(zip))
  assert.equal(result.source, 'result_content_list.json')
  assert.equal(result.formulas[0].latex, String.raw`\int_0^1 x^2\,\mathrm{d}x=\frac{1}{3}`)
})
