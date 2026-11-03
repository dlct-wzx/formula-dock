import type { UiLocale } from '../i18n/messages'
import {
  DEFAULT_MATH_RENDERER,
  normaliseMathRenderer,
  type MathRenderer,
} from './mathRenderer'

export interface UiPreferences {
  uiLocale: UiLocale
  interfaceScale: number
  editorFontSize: number
  mathRenderer: MathRenderer
}

const STORAGE_KEY = 'formuladock:ui-preferences'
const DEFAULT_PREFERENCES: UiPreferences = {
  uiLocale: 'zh',
  interfaceScale: 100,
  editorFontSize: 12,
  mathRenderer: DEFAULT_MATH_RENDERER,
}

const INTERFACE_SCALE_PRESETS = [90, 100, 110, 140, 160]

export function normaliseInterfaceScale(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 100
  const clamped = Math.min(160, Math.max(90, parsed))
  return INTERFACE_SCALE_PRESETS.reduce((closest, candidate) =>
    Math.abs(candidate - clamped) <= Math.abs(closest - clamped) ? candidate : closest,
  )
}

export function normaliseFontSize(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return DEFAULT_PREFERENCES.editorFontSize
  return Math.min(24, Math.max(10, Math.round(parsed)))
}

export function normaliseUiPreferences(value: unknown): UiPreferences {
  const candidate = value && typeof value === 'object' ? (value as Partial<UiPreferences>) : {}
  return {
    uiLocale: candidate.uiLocale === 'en' ? 'en' : 'zh',
    interfaceScale: normaliseInterfaceScale(candidate.interfaceScale),
    editorFontSize: normaliseFontSize(candidate.editorFontSize),
    mathRenderer: normaliseMathRenderer(candidate.mathRenderer),
  }
}

export function loadUiPreferences(): UiPreferences {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? normaliseUiPreferences(JSON.parse(saved)) : DEFAULT_PREFERENCES
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveUiPreferences(preferences: UiPreferences): UiPreferences {
  const normalised = normaliseUiPreferences(preferences)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised))
  return normalised
}
