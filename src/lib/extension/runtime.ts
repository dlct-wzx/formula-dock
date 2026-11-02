import type { ExtensionSettings } from './settings'

export interface PageInsertionResult {
  ok: boolean
  message: string
  target?: 'textarea' | 'input' | 'contenteditable'
}

interface RuntimeResponse extends PageInsertionResult {
  error?: string
  errorCode?: string
  originPattern?: string
}

export class HostPermissionRequiredError extends Error {
  originPattern: string

  constructor(originPattern: string) {
    super('Host access is required for page insertion.')
    this.name = 'HostPermissionRequiredError'
    this.originPattern = originPattern
  }
}

async function sendInsertionMessage(
  text: string,
  settings: ExtensionSettings,
): Promise<RuntimeResponse> {
  const response = (await chrome.runtime.sendMessage({
    type: 'FORMULADOCK_INSERT_TO_PAGE',
    text,
    insertFormat: settings.insertFormat,
  })) as RuntimeResponse | undefined

  if (!response) throw new Error('Extension background did not return a result.')
  if (!response.ok && response.errorCode === 'HOST_PERMISSION_REQUIRED' && response.originPattern) {
    throw new HostPermissionRequiredError(response.originPattern)
  }
  if (!response.ok) throw new Error(response.error || response.message || 'Unable to insert.')
  return response
}

export async function insertLatexIntoActivePage(
  text: string,
  settings: ExtensionSettings,
): Promise<PageInsertionResult> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
    throw new Error('当前不是浏览器扩展环境。')
  }
  if (!text.trim()) throw new Error('没有可插入的公式。')
  return sendInsertionMessage(text, settings)
}

export async function requestExtensionHostPermission(originPattern: string): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) return false
  try {
    return await chrome.permissions.request({ origins: [originPattern] })
  } catch {
    return false
  }
}
