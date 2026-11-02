import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

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
const profileDir = path.resolve(`artifacts/extension-profile-${Date.now()}`)
await fsPromises.mkdir(path.dirname(profileDir), { recursive: true })

const headless = process.env.EXTENSION_HEADLESS !== 'false'
const context = await chromium.launchPersistentContext(profileDir, {
  headless,
  executablePath,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ],
})

try {
  let worker = context.serviceWorkers()[0]
  if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15_000 })
  const extensionId = new URL(worker.url()).host
  assert.ok(extensionId, 'Could not resolve extension ID.')

  const page = await context.newPage()
  await page.setViewportSize({ width: 480, height: 900 })
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
    waitUntil: 'networkidle',
  })
  await page.locator('.app--extension').waitFor()
  await page.getByText('把 LaTeX 插入当前网页').waitFor()
  await page.evaluate(() =>
    chrome.storage.local.set({
      'latexlive-studio:extension-settings': {
        mineruToken: 'extension-smoke-test-token',
        modelVersion: 'vlm',
        language: 'ch',
        insertFormat: 'dollar-inline',
        uiLocale: 'en',
        editorFontSize: 18,
      },
    }),
  )
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByText('MinerU configured').waitFor()
  await page.getByText('Insert LaTeX into the current page').waitFor()
  assert.match(await page.locator('.api-status').textContent(), /MINERU LIVE/)
  assert.equal(
    await page.locator('.latex-editor').evaluate((element) => getComputedStyle(element).fontSize),
    '18px',
  )
  const categoryColumnCount = await page.evaluate(
    () =>
      new Set(
        Array.from(document.querySelectorAll('.quick-category:not(.quick-category--open)')).map(
          (element) => Math.round(element.getBoundingClientRect().left),
        ),
      ).size,
  )
  assert.ok(categoryColumnCount >= 2, `Expected block categories in multiple columns, got ${categoryColumnCount}`)
  const sidepanelOverflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(
    sidepanelOverflow.documentWidth <= sidepanelOverflow.viewport + 1,
    `Side panel horizontal overflow: ${sidepanelOverflow.documentWidth}px > ${sidepanelOverflow.viewport}px`,
  )

  await page.locator('.quick-category__toggle').first().hover()
  const quickHoverPanel = page.locator('.quick-hover-panel')
  await quickHoverPanel.waitFor({ state: 'visible' })
  await quickHoverPanel.getByText('Binary operators').waitFor()
  await page.waitForTimeout(220)
  await page.screenshot({
    path: path.resolve('artifacts/extension-sidepanel.png'),
    fullPage: true,
  })
  await page.mouse.move(0, 0)
  await quickHoverPanel.waitFor({ state: 'detached' })

  await page.getByRole('tab', { name: /Formula templates/ }).click()
  await page.locator('.template-category-chip').first().hover()
  const templateHoverPanel = page.locator('.template-hover-panel')
  await templateHoverPanel.waitFor({ state: 'visible' })
  await templateHoverPanel.getByText('Quadratic formula', { exact: true }).waitFor()
  await page.waitForTimeout(220)
  await page.screenshot({
    path: path.resolve('artifacts/extension-template-hover.png'),
    fullPage: true,
  })
  await page.mouse.move(0, 0)
  await templateHoverPanel.waitFor({ state: 'detached' })
  await page.getByRole('tab', { name: /Quick tools/ }).click()

  const optionsPage = await context.newPage()
  await optionsPage.goto(`chrome-extension://${extensionId}/options.html`, {
    waitUntil: 'domcontentloaded',
  })
  await optionsPage.locator('#settingsForm').waitFor()
  assert.equal(await optionsPage.locator('#mineruToken').inputValue(), 'extension-smoke-test-token')
  assert.equal(await optionsPage.locator('#uiLocale').inputValue(), 'en')
  assert.equal(await optionsPage.locator('#editorFontSize').inputValue(), '18')
  assert.equal(await optionsPage.title(), 'FormulaDock Extension Settings')
  await optionsPage.getByText('Connect MinerU and choose how formulas are inserted into webpages.').waitFor()
  assert.equal(await optionsPage.locator('html').getAttribute('lang'), 'en')
  await optionsPage.screenshot({
    path: path.resolve('artifacts/extension-options.png'),
    fullPage: true,
  })

  const migrated = await page.evaluate(() =>
    chrome.storage.local.get([
      'formuladock:extension-settings',
      'latexlive-studio:extension-settings',
    ]),
  )
  assert.equal(migrated['formuladock:extension-settings']?.mineruToken, 'extension-smoke-test-token')
  assert.equal(migrated['latexlive-studio:extension-settings'], undefined)
  await page.evaluate(() =>
    chrome.storage.local.remove([
      'formuladock:extension-settings',
      'latexlive-studio:extension-settings',
    ]),
  )
  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`)
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join(' | ')}`)

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        headless,
        extensionId,
        sidepanel: true,
        optionsPage: true,
        storageSettings: true,
        legacySettingsMigration: true,
        englishLocale: true,
        editorFontSize: 18,
        quickCategoryColumns: categoryColumnCount,
        quickToolHoverPanel: true,
        templateHoverPanel: true,
        sidepanelWidth: 480,
        sidepanelOverflow: false,
        screenshots: [
          'artifacts/extension-sidepanel.png',
          'artifacts/extension-template-hover.png',
          'artifacts/extension-options.png',
        ],
      },
      null,
      2,
    ),
  )
} finally {
  await context.close()
  await fsPromises.rm(profileDir, { recursive: true, force: true }).catch(() => {})
}
