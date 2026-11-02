import type { UiLocale } from '../../i18n/messages'
import { normaliseFontSize } from '../preferences'

export const EXTENSION_SETTINGS_KEY = 'formuladock:extension-settings'
export const LEGACY_EXTENSION_SETTINGS_KEY = 'latexlive-studio:extension-settings'

export type InsertFormat = 'raw' | 'dollar-inline' | 'dollar-display' | 'bracket-display'
export type MineruModel = 'vlm' | 'pipeline'
export type MineruLanguage = 'ch' | 'en'

export interface ExtensionSettings {
  mineruToken: string
  modelVersion: MineruModel
  language: MineruLanguage
  insertFormat: InsertFormat
  uiLocale: UiLocale
  editorFontSize: number
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  mineruToken: '',
  modelVersion: 'vlm',
  language: 'ch',
  insertFormat: 'raw',
  uiLocale: 'zh',
  editorFontSize: 12,
}

export function isExtensionContext(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id)
  } catch {
    return false
  }
}

export function normaliseExtensionSettings(value: unknown): ExtensionSettings {
  const candidate =
    value && typeof value === 'object' ? (value as Partial<ExtensionSettings>) : {}
  return {
    mineruToken: typeof candidate.mineruToken === 'string' ? candidate.mineruToken.trim() : '',
    modelVersion: candidate.modelVersion === 'pipeline' ? 'pipeline' : 'vlm',
    language: candidate.language === 'en' ? 'en' : 'ch',
    insertFormat:
      candidate.insertFormat === 'dollar-inline' ||
      candidate.insertFormat === 'dollar-display' ||
      candidate.insertFormat === 'bracket-display'
        ? candidate.insertFormat
        : 'raw',
    uiLocale: candidate.uiLocale === 'en' ? 'en' : 'zh',
    editorFontSize: normaliseFontSize(candidate.editorFontSize),
  }
}

export async function saveExtensionSettings(settings: ExtensionSettings): Promise<ExtensionSettings> {
  if (!isExtensionContext()) return normaliseExtensionSettings(settings)
  const normalised = normaliseExtensionSettings(settings)
  await chrome.storage.local.set({ [EXTENSION_SETTINGS_KEY]: normalised })
  return normalised
}

export async function loadExtensionSettings(): Promise<ExtensionSettings> {
  if (!isExtensionContext()) return DEFAULT_EXTENSION_SETTINGS
  const stored = await chrome.storage.local.get([
    EXTENSION_SETTINGS_KEY,
    LEGACY_EXTENSION_SETTINGS_KEY,
  ])
  const current = stored[EXTENSION_SETTINGS_KEY]
  const legacy = stored[LEGACY_EXTENSION_SETTINGS_KEY]
  const settings = normaliseExtensionSettings(current ?? legacy)

  if (legacy !== undefined) {
    if (current === undefined) {
      await chrome.storage.local.set({ [EXTENSION_SETTINGS_KEY]: settings })
    }
    await chrome.storage.local.remove(LEGACY_EXTENSION_SETTINGS_KEY)
  }

  return settings
}

export function subscribeExtensionSettings(
  listener: (settings: ExtensionSettings) => void,
): () => void {
  if (!isExtensionContext()) return () => undefined

  const handleChange = (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: string,
  ) => {
    if (areaName !== 'local' || !changes[EXTENSION_SETTINGS_KEY]) return
    listener(normaliseExtensionSettings(changes[EXTENSION_SETTINGS_KEY].newValue))
  }

  chrome.storage.onChanged.addListener(handleChange)
  return () => chrome.storage.onChanged.removeListener(handleChange)
}

export async function openExtensionOptions(): Promise<void> {
  if (!isExtensionContext()) throw new Error('当前不是浏览器扩展环境。')
  await chrome.runtime.openOptionsPage()
}
