import {
  detectImageType,
  extensionForMime,
  extractFormulasFromMarkdown,
  normaliseImageFileName,
  processMineruZip,
  stripMathDelimiters,
  toFormulaResponse,
} from '../shared/formula-parser.mjs'

export {
  detectImageType,
  extensionForMime,
  extractFormulasFromMarkdown,
  normaliseImageFileName,
  processMineruZip,
  stripMathDelimiters,
  toFormulaResponse,
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export class ImageValidationError extends Error {
  constructor(message, statusCode = 400, code = 'INVALID_IMAGE') {
    super(message)
    this.name = 'ImageValidationError'
    this.statusCode = statusCode
    this.code = code
  }
}

export function decodeFileName(headerValue) {
  if (!headerValue) return 'formula.png'
  try {
    return decodeURIComponent(headerValue)
  } catch {
    return headerValue
  }
}

export function validateImage({ buffer, contentType, fileName }) {
  if (!buffer.length) {
    throw new ImageValidationError('图片为空，请重新选择文件。', 400, 'EMPTY_IMAGE')
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageValidationError('图片不能超过 10 MB。', 413, 'IMAGE_TOO_LARGE')
  }

  const declaredType = String(contentType || '').split(';')[0].trim().toLowerCase()
  if (!ALLOWED_IMAGE_TYPES.has(declaredType)) {
    throw new ImageValidationError('仅支持 PNG、JPEG 和 WebP 图片。', 415, 'UNSUPPORTED_IMAGE_TYPE')
  }

  const detectedType = detectImageType(buffer)
  if (!detectedType || detectedType !== declaredType) {
    throw new ImageValidationError('图片内容与文件类型不匹配。', 415, 'INVALID_IMAGE_SIGNATURE')
  }

  return {
    mimeType: detectedType,
    fileName: normaliseImageFileName(fileName, detectedType),
    size: buffer.length,
  }
}
