import type { UiLocale } from '../i18n/messages'

export interface UiPreferences {
  uiLocale: UiLocale
  editorFontSize: number
}

const STORAGE_KEY = 'formuladock:ui-preferences'
const DEFAULT_PREFERENCES: UiPreferences = {
  uiLocale: 'zh',
  editorFontSize: 12,
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
    editorFontSize: normaliseFontSize(candidate.editorFontSize),
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
