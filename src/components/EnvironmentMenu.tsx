import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Braces, ChevronDown } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import type { MessageKey } from '../i18n/messages'
import { LATEX_ENVIRONMENTS, type LatexEnvironment } from '../lib/latexEnvironments'

interface EnvironmentMenuProps {
  onSelect: (environment: LatexEnvironment) => void
}

interface MenuPosition {
  left: number
  top: number
  width: number
}

const LABEL_KEYS: Record<LatexEnvironment, MessageKey> = {
  none: 'environment.none',
  eqnarray: 'environment.eqnarray',
  align: 'environment.align',
  aligned: 'environment.aligned',
  gathered: 'environment.gathered',
  cases: 'environment.cases',
  split: 'environment.split',
  array: 'environment.array',
}

export function EnvironmentMenu({ onSelect }: EnvironmentMenuProps) {
  const { t } = useI18n()
  const menuId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null)
      return
    }

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const edge = 10
      const gap = 7
      const width = 176
      const rect = trigger.getBoundingClientRect()
      const menuHeight = menuRef.current?.offsetHeight ?? 320
      const left = Math.min(Math.max(edge, rect.right - width), window.innerWidth - width - edge)
      const fitsBelow = rect.bottom + gap + menuHeight <= window.innerHeight - edge
      const top = fitsBelow
        ? rect.bottom + gap
        : Math.max(edge, rect.top - gap - Math.min(menuHeight, window.innerHeight - edge * 2))
      setPosition({ left, top, width })
    }

    updatePosition()
    const resizeObserver = new ResizeObserver(updatePosition)
    if (menuRef.current) resizeObserver.observe(menuRef.current)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutsideClick)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const style: CSSProperties = position
    ? { left: position.left, top: position.top, width: position.width }
    : { visibility: 'hidden' }

  return (
    <div className="environment-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="button button--ghost button--small environment-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t('environment.button')}
      >
        <Braces size={14} aria-hidden="true" />
        {t('environment.button')}
        <ChevronDown size={13} className="environment-menu__chevron" aria-hidden="true" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            className="environment-menu__list"
            role="menu"
            aria-label={t('environment.menuAria')}
            style={style}
          >
            {LATEX_ENVIRONMENTS.map((environment) => (
              <button
                key={environment}
                type="button"
                className="environment-menu__item"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  onSelect(environment)
                }}
                aria-label={t(LABEL_KEYS[environment])}
              >
                <span>{t(LABEL_KEYS[environment])}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}