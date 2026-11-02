import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import type { ToastTone } from '../types'

export interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

interface ToastProps {
  toast: ToastState | null
  onClose: () => void
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null
  const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? AlertCircle : Info

  return (
    <div className={`toast toast--${toast.tone}`} role="status" aria-live="polite">
      <Icon size={18} aria-hidden="true" />
      <span>{toast.message}</span>
      <button type="button" className="toast__close" onClick={onClose} aria-label="关闭提示">
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  )
}
