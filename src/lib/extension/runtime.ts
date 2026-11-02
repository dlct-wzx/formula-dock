import type { ExtensionSettings } from './settings'

export interface PageInsertionResult {
  ok: boolean
  message: string
  target?: 'textarea' | 'input' | 'contenteditable'
}

interface RuntimeResponse extends PageInsertionResult {
  error?: string
}

export async function insertLatexIntoActivePage(
  text: string,
  settings: ExtensionSettings,
): Promise<PageInsertionResult> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.id) {
    throw new Error('当前不是浏览器扩展环境。')
  }
  if (!text.trim()) throw new Error('没有可插入的公式。')

  const response = (await chrome.runtime.sendMessage({
    type: 'LATEX_STUDIO_INSERT_TO_PAGE',
    text,
    insertFormat: settings.insertFormat,
  })) as RuntimeResponse | undefined

  if (!response) throw new Error('扩展开关服务没有返回结果。')
  if (!response.ok) throw new Error(response.error || response.message || '无法插入当前网页。')
  return response
}
