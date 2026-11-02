import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

interface HoverPanelProps {
  open: boolean
  anchor: HTMLElement | null
  preferredWidth?: number
  className?: string
  onMouseEnter: () => void
  onMouseLeave: () => void
  onClose: () => void
  children: ReactNode
}

interface PanelPosition {
  left: number
  top: number
  width: number
}

export function HoverPanel({
  open,
  anchor,
  preferredWidth = 620,
  className = '',
  onMouseEnter,
  onMouseLeave,
  onClose,
  children,
}: HoverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<PanelPosition | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const edge = 12
      const gap = 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const width = Math.min(preferredWidth, viewportWidth - edge * 2)
      const panelHeight = panelRef.current?.offsetHeight || 320
      const anchorRect = anchor.getBoundingClientRect()
      const maxLeft = Math.max(edge, viewportWidth - width - edge)
      const left = Math.min(Math.max(anchorRect.left, edge), maxLeft)
      const fitsBelow = anchorRect.bottom + gap + panelHeight <= viewportHeight - edge
      const fitsAbove = anchorRect.top - gap - panelHeight >= edge
      let top = fitsBelow || !fitsAbove ? anchorRect.bottom + gap : anchorRect.top - gap - panelHeight
      top = Math.max(edge, Math.min(top, viewportHeight - edge - Math.min(panelHeight, viewportHeight - edge * 2)))
      setPosition({ left, top, width })
    }

    updatePosition()
    const resizeObserver = new ResizeObserver(updatePosition)
    if (panelRef.current) resizeObserver.observe(panelRef.current)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchor, open, preferredWidth])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open || !anchor) return null

  const style: CSSProperties = position
    ? {
        left: position.left,
        top: position.top,
        width: position.width,
      }
    : { visibility: 'hidden' }

  return createPortal(
    <div
      ref={panelRef}
      className={`hover-panel ${className}`.trim()}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      role="region"
    >
      {children}
    </div>,
    document.body,
  )
}

export function useHoverFlyout<T extends HTMLElement>() {
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<T | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [])

  const closeNow = useCallback(() => {
    cancelClose()
    setActiveKey(null)
    setAnchor(null)
  }, [cancelClose])

  const open = useCallback(
    (key: string, element: T) => {
      cancelClose()
      setActiveKey(key)
      setAnchor(element)
    },
    [cancelClose],
  )

  const scheduleClose = useCallback(() => {
    cancelClose()
    closeTimerRef.current = window.setTimeout(() => {
      setActiveKey(null)
      setAnchor(null)
      closeTimerRef.current = null
    }, 160)
  }, [cancelClose])

  useEffect(() => () => cancelClose(), [cancelClose])

  return { activeKey, anchor, open, scheduleClose, cancelClose, closeNow }
}
