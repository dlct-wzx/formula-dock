'use strict'

const STORAGE_KEY = 'formuladock:extension-settings'
const LEGACY_STORAGE_KEY = 'latexlive-studio:extension-settings'
const form = document.getElementById('settingsForm')
const tokenInput = document.getElementById('mineruToken')
const toggleTokenButton = document.getElementById('toggleToken')
const uiLocaleSelect = document.getElementById('uiLocale')
const editorFontSizeInput = document.getElementById('editorFontSize')
const interfaceScaleSelect = document.getElementById('interfaceScale')
const modelSelect = document.getElementById('modelVersion')
const languageSelect = document.getElementById('language')
const saveButton = document.getElementById('saveButton')
const testButton = document.getElementById('testButton')
const status = document.getElementById('status')

const I18N = {
  zh: {
    title: 'FormulaDock 插件设置',
    brandAria: '打开 FormulaDock 侧边栏',
    subtitle: '浏览器扩展设置',
    introTitle: '连接 MinerU，并为公式工作台设置舒适的界面。',
    introBody: 'Token 只保存在当前浏览器的 <code>chrome.storage.local</code>，不会写入项目源码，也不会上传到本项目的 Web 服务。',
    interfaceTitle: '界面设置',
    interfaceDesc: '调整界面语言、界面字号和 LaTeX 编辑器字号。',
    uiLanguage: '界面语言',
    uiLanguageHint: '切换侧边栏和设置页语言',
    interfaceScale: '界面字号',
    interfaceScaleHint: '调整工具、按钮和说明文字',
    scaleSmall: '小（90%）',
    scaleStandard: '标准（100%）',
    scaleComfortable: '较大（110%）',
    scaleLarge: '大（140%）',
    scaleExtraLarge: '特大（160%）',
    editorFontSize: '编辑器字号',
    editorFontSizeHint: '10–24 px',
    mineruTitle: 'MinerU 图片识别',
    mineruDesc: '插件直接调用 MinerU 精准解析 API，不依赖本地 Node 服务。',
    apiDocs: 'API 文档 ↗',
    tokenLabel: 'API Token',
    tokenHint: '必填，保存在本机扩展存储中',
    tokenPlaceholder: '粘贴 MinerU API Token',
    show: '显示',
    hide: '隐藏',
    modelLabel: '模型',
    modelHint: '图片公式推荐 VLM',
    modelVlm: 'MinerU VLM（推荐）',
    modelPipeline: 'MinerU Pipeline',
    ocrLanguageLabel: 'OCR 语言',
    ocrLanguageHint: '影响中文/英文识别',
    ocrLanguageCh: '中文 + English',
    ocrLanguageEn: 'English',

    testToken: '测试 Token',
    testing: '测试中…',
    save: '保存设置',
    saving: '保存中…',
    statusNoToken: '尚未配置 MinerU Token。配置后即可识别图片。',
    statusLoaded: '设置已加载。',
    statusReadError: '读取扩展设置失败。',
    statusSaved: '设置已保存。',
    statusTokenRequired: '请先填写 MinerU Token。',
    statusTesting: '正在向 MinerU 验证 Token…',
    statusTokenInvalid: 'Token 无效或已过期，请检查后重试。',
    statusTokenValid: 'Token 已被 MinerU 服务端接受，设置已保存。',
    statusNetworkError: '无法连接 MinerU。请检查网络后重试。',
    statusSaveError: '保存设置失败。',
  },
  en: {
    title: 'FormulaDock Extension Settings',
    brandAria: 'Open the FormulaDock side panel',
    subtitle: 'Browser extension settings',
    introTitle: 'Connect MinerU and tune the formula workspace for comfortable reading.',
    introBody: 'The token is stored only in <code>chrome.storage.local</code>. It is not written to the project source or uploaded to the FormulaDock web service.',
    interfaceTitle: 'Interface',
    interfaceDesc: 'Adjust the interface language, interface text size, and LaTeX editor font size.',
    uiLanguage: 'Interface language',
    uiLanguageHint: 'Changes the side panel and settings page',
    interfaceScale: 'Interface text size',
    interfaceScaleHint: 'Changes tools, buttons, and labels',
    scaleSmall: 'Small (90%)',
    scaleStandard: 'Standard (100%)',
    scaleComfortable: 'Comfortable (110%)',
    scaleLarge: 'Large (140%)',
    scaleExtraLarge: 'Extra large (160%)',
    editorFontSize: 'Editor font size',
    editorFontSizeHint: '10–24 px',
    mineruTitle: 'MinerU image recognition',
    mineruDesc: 'The extension calls the MinerU precise parsing API directly without a local Node service.',
    apiDocs: 'API docs ↗',
    tokenLabel: 'API token',
    tokenHint: 'Required; stored in local extension storage',
    tokenPlaceholder: 'Paste a MinerU API token',
    show: 'Show',
    hide: 'Hide',
    modelLabel: 'Model',
    modelHint: 'VLM is recommended for formula images',
    modelVlm: 'MinerU VLM (recommended)',
    modelPipeline: 'MinerU Pipeline',
    ocrLanguageLabel: 'OCR language',
    ocrLanguageHint: 'Affects Chinese and English recognition',
    ocrLanguageCh: 'Chinese + English',
    ocrLanguageEn: 'English',

    testToken: 'Test token',
    testing: 'Testing…',
    save: 'Save settings',
    saving: 'Saving…',
    statusNoToken: 'No MinerU token is configured. Add one to enable image recognition.',
    statusLoaded: 'Settings loaded.',
    statusReadError: 'Failed to read extension settings.',
    statusSaved: 'Settings saved.',
    statusTokenRequired: 'Enter a MinerU token first.',
    statusTesting: 'Validating the token with MinerU…',
    statusTokenInvalid: 'The token is invalid or expired. Check it and try again.',
    statusTokenValid: 'MinerU accepted the token. Settings saved.',
    statusNetworkError: 'Could not connect to MinerU. Check your network and try again.',
    statusSaveError: 'Failed to save settings.',
  },
}

let currentLocale = 'zh'

function t(key) {
  return I18N[currentLocale]?.[key] || I18N.zh[key] || key
}

function applyLocale(locale) {
  currentLocale = locale === 'en' ? 'en' : 'zh'
  const dictionary = I18N[currentLocale]
  document.documentElement.lang = currentLocale === 'en' ? 'en' : 'zh-CN'
  document.title = dictionary.title

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n')
    if (key && dictionary[key]) element.textContent = dictionary[key]
  })
  document.querySelectorAll('[data-i18n-html]').forEach((element) => {
    const key = element.getAttribute('data-i18n-html')
    if (key && dictionary[key]) element.innerHTML = dictionary[key]
  })
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder')
    if (key && dictionary[key]) element.setAttribute('placeholder', dictionary[key])
  })
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const key = element.getAttribute('data-i18n-aria-label')
    if (key && dictionary[key]) element.setAttribute('aria-label', dictionary[key])
  })

  if (toggleTokenButton) {
    toggleTokenButton.textContent = tokenInput.type === 'password' ? t('show') : t('hide')
  }
  if (!testButton.disabled) testButton.textContent = t('testToken')
  if (!saveButton.disabled) saveButton.textContent = t('save')
}

function setStatus(key, kind = '') {
  status.textContent = t(key)
  status.className = `status${kind ? ` status--${kind}` : ''}`
}

const INTERFACE_SCALE_PRESETS = [90, 100, 110, 140, 160]

function normaliseInterfaceScale(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 100
  const clamped = Math.min(160, Math.max(90, parsed))
  return INTERFACE_SCALE_PRESETS.reduce((closest, candidate) =>
    Math.abs(candidate - clamped) <= Math.abs(closest - clamped) ? candidate : closest,
  )
}

function applyInterfaceScale(value) {
  const scale = normaliseInterfaceScale(value)
  document.documentElement.style.setProperty('--ui-font-scale', String(scale / 100))
  return scale
}

function normaliseFontSize(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 12
  return Math.min(24, Math.max(10, Math.round(parsed)))
}

function normaliseSettings(value) {
  const candidate = value && typeof value === 'object' ? value : {}
  return {
    mineruToken: typeof candidate.mineruToken === 'string' ? candidate.mineruToken.trim() : '',
    modelVersion: candidate.modelVersion === 'pipeline' ? 'pipeline' : 'vlm',
    language: candidate.language === 'en' ? 'en' : 'ch',

    uiLocale: candidate.uiLocale === 'en' ? 'en' : 'zh',
    interfaceScale: normaliseInterfaceScale(candidate.interfaceScale),
    editorFontSize: normaliseFontSize(candidate.editorFontSize),
  }
}

function readForm() {
  return normaliseSettings({
    mineruToken: tokenInput.value,
    modelVersion: modelSelect.value,
    language: languageSelect.value,
    uiLocale: uiLocaleSelect.value,
    interfaceScale: interfaceScaleSelect.value,
    editorFontSize: editorFontSizeInput.value,
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
    uiLocaleSelect.value = settings.uiLocale
    interfaceScaleSelect.value = String(settings.interfaceScale)
    applyInterfaceScale(settings.interfaceScale)
    editorFontSizeInput.value = String(settings.editorFontSize)
    modelSelect.value = settings.modelVersion
    languageSelect.value = settings.language
    applyLocale(settings.uiLocale)
    setStatus(settings.mineruToken ? 'statusLoaded' : 'statusNoToken', settings.mineruToken ? '' : 'warning')
  } catch {
    setStatus('statusReadError', 'error')
  }
}

async function saveSettings(showSuccess = true) {
  const settings = readForm()
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
  applyLocale(settings.uiLocale)
  if (showSuccess) setStatus('statusSaved', 'success')
  return settings
}

async function testToken() {
  const settings = readForm()
  if (!settings.mineruToken) {
    setStatus('statusTokenRequired', 'warning')
    tokenInput.focus()
    return
  }

  testButton.disabled = true
  testButton.textContent = t('testing')
  setStatus('statusTesting')

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
      setStatus('statusTokenInvalid', 'error')
      return
    }
    setStatus('statusTokenValid', 'success')
  } catch {
    setStatus('statusNetworkError', 'error')
  } finally {
    testButton.disabled = false
    testButton.textContent = t('testToken')
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  saveButton.disabled = true
  saveButton.textContent = t('saving')
  try {
    await saveSettings(true)
  } catch {
    setStatus('statusSaveError', 'error')
  } finally {
    saveButton.disabled = false
    saveButton.textContent = t('save')
  }
})

uiLocaleSelect.addEventListener('change', () => {
  applyLocale(uiLocaleSelect.value)
})

interfaceScaleSelect.addEventListener('change', () => {
  interfaceScaleSelect.value = String(applyInterfaceScale(interfaceScaleSelect.value))
})

editorFontSizeInput.addEventListener('change', () => {
  editorFontSizeInput.value = String(normaliseFontSize(editorFontSizeInput.value))
})

toggleTokenButton.addEventListener('click', () => {
  const shouldShow = tokenInput.type === 'password'
  tokenInput.type = shouldShow ? 'text' : 'password'
  toggleTokenButton.textContent = shouldShow ? t('hide') : t('show')
})

testButton.addEventListener('click', testToken)

const manifest = chrome.runtime.getManifest()
document.getElementById('version').textContent = manifest.version

void loadSettings()
