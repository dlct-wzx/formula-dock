'use strict'

const STORAGE_KEY = 'formuladock:extension-settings'
const LEGACY_STORAGE_KEY = 'latexlive-studio:extension-settings'
const form = document.getElementById('settingsForm')
const tokenInput = document.getElementById('mineruToken')
const toggleTokenButton = document.getElementById('toggleToken')
const modelSelect = document.getElementById('modelVersion')
const languageSelect = document.getElementById('language')
const insertFormatSelect = document.getElementById('insertFormat')
const saveButton = document.getElementById('saveButton')
const testButton = document.getElementById('testButton')
const status = document.getElementById('status')

function setStatus(message, kind = '') {
  status.textContent = message
  status.className = `status${kind ? ` status--${kind}` : ''}`
}

function normaliseSettings(value) {
  const candidate = value && typeof value === 'object' ? value : {}
  return {
    mineruToken: typeof candidate.mineruToken === 'string' ? candidate.mineruToken.trim() : '',
    modelVersion: candidate.modelVersion === 'pipeline' ? 'pipeline' : 'vlm',
    language: candidate.language === 'en' ? 'en' : 'ch',
    insertFormat: ['raw', 'dollar-inline', 'dollar-display', 'bracket-display'].includes(
      candidate.insertFormat,
    )
      ? candidate.insertFormat
      : 'raw',
  }
}

function readForm() {
  return normaliseSettings({
    mineruToken: tokenInput.value,
    modelVersion: modelSelect.value,
    language: languageSelect.value,
    insertFormat: insertFormatSelect.value,
  })
}

async function loadSettings() {
  try {
    const stored = await chrome.storage.local.get([STORAGE_KEY, LEGACY_STORAGE_KEY])
    const settings = normaliseSettings(stored[STORAGE_KEY] ?? stored[LEGACY_STORAGE_KEY])
    if (stored[LEGACY_STORAGE_KEY] !== undefined) {
      if (stored[STORAGE_KEY] === undefined) {
        await chrome.storage.local.set({ [STORAGE_KEY]: settings })
      }
      await chrome.storage.local.remove(LEGACY_STORAGE_KEY)
    }
    tokenInput.value = settings.mineruToken
    modelSelect.value = settings.modelVersion
    languageSelect.value = settings.language
    insertFormatSelect.value = settings.insertFormat
    if (!settings.mineruToken) {
      setStatus('尚未配置 MinerU Token。配置后即可识别图片。', 'warning')
    } else {
      setStatus('设置已加载。')
    }
  } catch {
    setStatus('读取扩展设置失败。', 'error')
  }
}

async function saveSettings(showSuccess = true) {
  const settings = readForm()
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
  if (showSuccess) setStatus('设置已保存。', 'success')
  return settings
}

async function testToken() {
  const settings = readForm()
  if (!settings.mineruToken) {
    setStatus('请先填写 MinerU Token。', 'warning')
    tokenInput.focus()
    return
  }

  testButton.disabled = true
  testButton.textContent = '测试中…'
  setStatus('正在向 MinerU 验证 Token…')

  try {
    await saveSettings(false)
    const result = await chrome.runtime.sendMessage({
      type: 'FORMULADOCK_MINERU_API_REQUEST',
      path: '/extract-results/batch/00000000-0000-0000-0000-000000000000',
    })
    const payload = result?.payload || {}
    const code = String(payload.code ?? '')
    if (
      result?.status === 401 ||
      result?.status === 403 ||
      code === 'A0202' ||
      code === 'A0211' ||
      code === 'TOKEN_MISSING'
    ) {
      setStatus('Token 无效或已过期，请检查后重试。', 'error')
      return
    }

    setStatus('Token 已被 MinerU 服务端接受，设置已保存。', 'success')
  } catch {
    setStatus('无法连接 MinerU。请检查网络后重试。', 'error')
  } finally {
    testButton.disabled = false
    testButton.textContent = '测试 Token'
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  saveButton.disabled = true
  try {
    await saveSettings(true)
  } catch {
    setStatus('保存设置失败。', 'error')
  } finally {
    saveButton.disabled = false
  }
})

toggleTokenButton.addEventListener('click', () => {
  const shouldShow = tokenInput.type === 'password'
  tokenInput.type = shouldShow ? 'text' : 'password'
  toggleTokenButton.textContent = shouldShow ? '隐藏' : '显示'
})

testButton.addEventListener('click', testToken)

const manifest = chrome.runtime.getManifest()
document.getElementById('version').textContent = manifest.version

void loadSettings()
