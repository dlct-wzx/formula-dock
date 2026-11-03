export type ToolTab = 'shortcuts' | 'templates' | 'ocr'

export type ToastTone = 'success' | 'info' | 'error'

export interface OcrFormula {
  id: string
  latex: string
  displayMode: boolean
}

export type OcrStatus =
  | 'idle'
  | 'uploading'
  | 'pending'
  | 'processing'
  | 'done'
  | 'error'

export interface OcrResponse {
  state?: string
  mode?: 'mock' | 'live'
  taskId?: string
  formulas?: OcrFormula[]
  message?: string
  error?: string
  code?: string
  providerState?: string
  progress?: {
    extractedPages?: number
    totalPages?: number
  }
}
