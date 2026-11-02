import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

function readEnvToken() {
  if (process.env.MINERU_API_TOKEN?.trim()) return process.env.MINERU_API_TOKEN.trim()
  const envPath = path.resolve('.env.local')
  if (!fs.existsSync(envPath)) return ''
  const text = fs.readFileSync(envPath, 'utf8')
  return (
    text.match(/^\s*MINERU_API_TOKEN\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim() || ''
  )
}

const token = readEnvToken()
assert.ok(token, 'MINERU_API_TOKEN is not configured in the environment or .env.local.')

const browserCandidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate))
assert.ok(executablePath, 'No Edge/Chrome executable found. Set BROWSER_PATH.')

const extensionPath = path.resolve('extension-dist')
assert.ok(fs.existsSync(path.join(extensionPath, 'manifest.json')), 'Run npm run build:extension first.')
const artifactsDir = path.resolve('artifacts')
await fsPromises.mkdir(artifactsDir, { recursive: true })
const profileDir = path.resolve(`artifacts/extension-live-profile-${Date.now()}`)
const inputImagePath = path.join(artifactsDir, 'extension-live-ocr-input.png')

const context = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  executablePath,
  viewport: { width: 480, height: 900 },
  deviceScaleFactor: 2,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
})

const pageErrors = []
const consoleErrors = []
const failedResponses = []
const requestFailures = []

try {
  let worker = context.serviceWorkers()[0]
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15_000 })
  const extensionId = new URL(worker.url()).host
  const page = await context.newPage()
  page.on('pageerror', (error) => pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('response', (response) => {
    if (
      response.status() >= 400 &&
      /mineru|openxlab|aliyuncs/i.test(response.url())
    ) {
      failedResponses.push(`${response.status()} ${response.url()}`)
    }
  })
  page.on('requestfailed', (request) => {
    if (/mineru|openxlab|aliyuncs/i.test(request.url())) {
      requestFailures.push(`${request.failure()?.errorText || 'failed'} ${request.url()}`)
    }
  })

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
    waitUntil: 'networkidle',
  })
  await page.evaluate(
    (mineruToken) =>
      chrome.storage.local.set({
        'formuladock:extension-settings': {
          mineruToken,
          modelVersion: 'vlm',
          language: 'ch',
          uiLocale: 'en',
          editorFontSize: 16,
        },
      }),
    token,
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('.api-status').filter({ hasText: 'MINERU LIVE' }).waitFor()

  const editor = page.locator('.latex-editor')
  await editor.fill(String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`)
  await page.locator('.preview-math .katex').waitFor()
  await page.evaluate(() => {
    const surface = document.querySelector('.preview-surface')
    if (surface instanceof HTMLElement) surface.style.background = '#ffffff'
    const watermark = document.querySelector('.preview-watermark')
    if (watermark instanceof HTMLElement) watermark.style.display = 'none'
  })
  await page.locator('.preview-math').screenshot({ path: inputImagePath })

  await page.getByRole('tab', { name: /Image recognition/ }).click()
  await page.locator('input[type="file"]').setInputFiles(inputImagePath)
  await page.getByRole('button', { name: 'Start recognition', exact: true }).click()

  const deadline = Date.now() + 210_000
  let completed = false
  while (Date.now() < deadline) {
    if (await page.locator('.ocr-results').isVisible().catch(() => false)) {
      completed = true
      break
    }
    const errorMessage = page.locator('.ocr-message--error')
    if (await errorMessage.isVisible().catch(() => false)) {
      throw new Error(`Extension MinerU live test failed: ${await errorMessage.innerText()}`)
    }
    await page.waitForTimeout(3_000)
  }

  if (!completed) {
    const statusText = await page.locator('.ocr-status').innerText().catch(() => 'status unavailable')
    throw new Error(`Extension MinerU live test timed out. UI status: ${statusText}`)
  }

  const resultCards = page.locator('.ocr-formula-card')
  const formulaCount = await resultCards.count()
  assert.ok(formulaCount >= 1, 'Live MinerU test returned no formulas.')
  const source = await resultCards.first().locator('code').textContent()
  assert.ok(source?.trim(), 'Live MinerU result has no LaTeX source.')
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`)
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join(' | ')}`)
  assert.deepEqual(failedResponses, [], `Failed MinerU responses: ${failedResponses.join(' | ')}`)
  assert.deepEqual(requestFailures, [], `Failed MinerU requests: ${requestFailures.join(' | ')}`)

  await page.screenshot({
    path: path.join(artifactsDir, 'extension-live-ocr-result.png'),
    fullPage: true,
  })
  await page.evaluate(() => chrome.storage.local.remove('formuladock:extension-settings'))

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        liveMineru: true,
        formulaCount,
        tokenExposed: false,
        inputImage: inputImagePath,
        screenshot: path.join(artifactsDir, 'extension-live-ocr-result.png'),
      },
      null,
      2,
    ),
  )
} finally {
  if (pageErrors.length || consoleErrors.length || failedResponses.length || requestFailures.length) {
    console.error({ consoleErrors, pageErrors, failedResponses, requestFailures })
  }
  await context.close()
  await fsPromises.rm(profileDir, { recursive: true, force: true }).catch(() => {})
}
