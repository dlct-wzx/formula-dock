'use strict'

async function configureMineruHeaderRules() {
  const requestHeaders = [
    { header: 'origin', operation: 'remove' },
    { header: 'referer', operation: 'remove' },
  ]
  const rules = [
    { id: 9001, urlFilter: '||mineru.net/api/v4/' },
    { id: 9002, urlFilter: '||aliyuncs.com/' },
    { id: 9003, urlFilter: '||openxlab.org.cn/' },
  ].map((rule) => ({
    id: rule.id,
    priority: 1,
    action: { type: 'modifyHeaders', requestHeaders },
    condition: {
      urlFilter: rule.urlFilter,
      resourceTypes: ['xmlhttprequest', 'other'],
    },
  }))

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [9001, 9002, 9003],
      addRules: rules,
    })
  } catch {
    // Direct MinerU OCR will report the provider error if header modification fails.
  }
}

async function setPanelBehaviour() {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false })
  } catch {
    // Older Chromium versions can reject while the side panel is initialising.
  }
}

void configureMineruHeaderRules()
void setPanelBehaviour()
chrome.runtime.onInstalled.addListener(() => {
  void configureMineruHeaderRules()
  void setPanelBehaviour()
})

function openPanel(tabId) {
  chrome.sidePanel.open({ tabId }).catch(() => undefined)
}
async function getStoredMineruToken() {
  const currentKey = 'formuladock:extension-settings'
  const legacyKey = 'latexlive-studio:extension-settings'
  const stored = await chrome.storage.local.get([currentKey, legacyKey])
  const settings = stored[currentKey] || stored[legacyKey]
  return typeof settings?.mineruToken === 'string' ? settings.mineruToken.trim() : ''
}

function isAllowedMineruApiPath(pathValue) {
  return (
    typeof pathValue === 'string' &&
    (/^\/file-urls\/batch$/.test(pathValue) ||
      /^\/extract-results\/batch\/[A-Za-z0-9-]+$/.test(pathValue))
  )
}

async function mineruApiRequest(message) {
  const token = await getStoredMineruToken()
  if (!token) {
    return {
      ok: false,
      status: 401,
      payload: { code: 'TOKEN_MISSING', msg: '请在扩展设置中配置 MinerU Token。' },
    }
  }
  if (!isAllowedMineruApiPath(message.path)) {
    return {
      ok: false,
      status: 400,
      payload: { code: 'INVALID_PATH', msg: '不允许访问该 MinerU API 路径。' },
    }
  }

  const method = message.method === 'POST' ? 'POST' : 'GET'
  try {
    const response = await fetch(`https://mineru.net/api/v4${message.path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(message.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: message.body ? JSON.stringify(message.body) : undefined,
    })
    const text = await response.text()
    let payload = null
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
    return {
      ok: response.ok,
      status: response.status,
      payload,
      error: response.ok ? undefined : text.slice(0, 300),
    }
  } catch {
    return {
      ok: false,
      status: 0,
      payload: { code: 'NETWORK_ERROR', msg: '扩展后台无法连接 MinerU。' },
    }
  }
}
function isAllowedStorageUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase()
    return (
      host === 'aliyuncs.com' ||
      host.endsWith('.aliyuncs.com') ||
      host === 'openxlab.org.cn' ||
      host.endsWith('.openxlab.org.cn')
    )
  } catch {
    return false
  }
}

function base64ToBytes(value) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function bytesToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

async function uploadMineruFile(message) {
  if (!isAllowedStorageUrl(message.url)) {
    return { ok: false, status: 400, error: '上传地址不在允许的 MinerU 存储域名内。' }
  }
  try {
    const bytes = base64ToBytes(String(message.dataBase64 || ''))
    if (!bytes.length) return { ok: false, status: 400, error: '上传文件为空。' }
    if (bytes.length > 10 * 1024 * 1024) {
      return { ok: false, status: 413, error: '图片不能超过 10 MB。' }
    }

    const response = await fetch(message.url, {
      method: 'PUT',
      body: bytes,
    })
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `图片上传到 MinerU 失败（HTTP ${response.status}）。`,
      }
    }
    return { ok: true, status: response.status }
  } catch {
    return { ok: false, status: 0, error: '扩展后台无法上传图片到 MinerU。' }
  }
}

async function downloadMineruZip(message) {
  let host = 'unknown-host'
  try {
    host = new URL(message.url).hostname
  } catch {
    return { ok: false, status: 400, error: 'MinerU 结果下载地址无效。' }
  }

  if (!isAllowedStorageUrl(message.url)) {
    return {
      ok: false,
      status: 400,
      error: `下载地址不在允许的 MinerU 存储域名内（${host}）。`,
    }
  }

  const maxBytes = 25 * 1024 * 1024
  let lastError = '网络错误'

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(message.url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      })
      if (response.status === 429 || response.status >= 500) {
        lastError = `HTTP ${response.status}`
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)))
          continue
        }
        return { ok: false, status: response.status, error: `下载 MinerU 结果失败（HTTP ${response.status}，${host}）。` }
      }
      if (!response.ok) {
        return { ok: false, status: response.status, error: `下载 MinerU 结果失败（HTTP ${response.status}，${host}）。` }
      }
      const contentLength = Number(response.headers.get('content-length') || 0)
      if (contentLength > maxBytes) {
        return { ok: false, status: 413, error: 'MinerU 结果文件过大。' }
      }
      const buffer = await response.arrayBuffer()
      if (buffer.byteLength > maxBytes) {
        return { ok: false, status: 413, error: 'MinerU 结果文件过大。' }
      }
      return {
        ok: true,
        status: response.status,
        byteLength: buffer.byteLength,
        dataBase64: bytesToBase64(new Uint8Array(buffer)),
      }
    } catch (error) {
      lastError =
        error instanceof Error && error.name === 'TimeoutError'
          ? '下载超时'
          : error instanceof Error
            ? error.message
            : '网络错误'
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)))
      }
    }
  }

  return {
    ok: false,
    status: 0,
    error: `扩展后台无法下载 MinerU 结果（${host}）：${lastError}`,
  }
}
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) openPanel(tab.id)
})

chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-formula-panel' && tab?.id) openPanel(tab.id)
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message?.type === 'FORMULADOCK_MINERU_API_REQUEST') {
    mineruApiRequest(message)
      .then(sendResponse)
      .catch(() => {
        sendResponse({
          ok: false,
          status: 0,
          payload: { code: 'NETWORK_ERROR', msg: '扩展后台请求 MinerU 失败。' },
        })
      })
    return true
  }

  if (message?.type === 'FORMULADOCK_MINERU_UPLOAD') {
    uploadMineruFile(message).then(sendResponse)
    return true
  }

  if (message?.type === 'FORMULADOCK_MINERU_DOWNLOAD_ZIP') {
    downloadMineruZip(message).then(sendResponse)
    return true
  }


  return false
})
