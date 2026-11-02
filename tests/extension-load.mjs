import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import http from 'node:http'
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

const targetServer = http.createServer((_request, response) => {
  response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  response.end('<!doctype html><html><body><textarea id="target"></textarea></body></html>')
})
await new Promise((resolve) => targetServer.listen(0, '127.0.0.1', resolve))
const targetAddress = targetServer.address()
const targetUrl = `http://127.0.0.1:${targetAddress.port}/`

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
        interfaceScale: 110,
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
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-font-scale')),
    '1.1',
  )
  assert.equal(
    await page.locator('.tool-tab strong').first().evaluate((element) => getComputedStyle(element).fontSize),
    '11px',
  )
  const toolPanelLayout = await page.locator('.quick-tools-panel').evaluate((element) => ({
    overflowY: getComputedStyle(element).overflowY,
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }))
  assert.equal(toolPanelLayout.overflowY, 'visible', 'Tool panel must not create an internal scrollbar.')
  assert.ok(
    toolPanelLayout.scrollHeight <= toolPanelLayout.clientHeight + 1,
    `Tool panel should grow with its content: ${toolPanelLayout.scrollHeight}px > ${toolPanelLayout.clientHeight}px`,
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
  const templateCategoryColumnCount = await page.evaluate(
    () =>
      new Set(
        Array.from(document.querySelectorAll('.template-category')).map((element) =>
          Math.round(element.getBoundingClientRect().left),
        ),
      ).size,
  )
  assert.ok(
    templateCategoryColumnCount >= 2,
    `Expected responsive template category cards, got ${templateCategoryColumnCount} column(s)`,
  )
  assert.equal(await page.locator('.template-category-scroller').count(), 0)
  await page.screenshot({
    path: path.resolve('artifacts/extension-template-categories.png'),
    fullPage: true,
  })
  await page.locator('.template-category__toggle').first().hover()
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

  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.locator('.preferences-dialog').waitFor()
  assert.equal(await page.locator('#preferences-title').textContent(), 'Interface settings')
  const optionsPagePromise = context.waitForEvent('page')
  await page.locator('.preferences-dialog__link').click()
  const optionsPage = await optionsPagePromise
  await page.locator('.preferences-dialog').waitFor({ state: 'detached' })
  await optionsPage.waitForLoadState('domcontentloaded')
  await optionsPage.locator('#settingsForm').waitFor()
  assert.equal(await optionsPage.locator('#mineruToken').inputValue(), 'extension-smoke-test-token')
  assert.equal(await optionsPage.locator('#uiLocale').inputValue(), 'en')
  assert.equal(await optionsPage.locator('#interfaceScale').inputValue(), '110')
  assert.equal(await optionsPage.locator('#editorFontSize').inputValue(), '18')
  assert.equal(await optionsPage.title(), 'FormulaDock Extension Settings')
  await optionsPage.getByText('Connect MinerU and choose how formulas are inserted into webpages.').waitFor()
  assert.equal(await optionsPage.locator('html').getAttribute('lang'), 'en')
  await optionsPage.screenshot({
    path: path.resolve('artifacts/extension-options.png'),
    fullPage: true,
  })
  await optionsPage.close()
  await page.bringToFront()
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.locator('.preferences-dialog').waitFor()
  assert.equal(await page.locator('#preferences-title').textContent(), 'Interface settings')
  await page.getByRole('button', { name: 'Close settings' }).click()
  await page.locator('.preferences-dialog').waitFor({ state: 'detached' })

  const targetPage = await context.newPage()
  await targetPage.goto(targetUrl, { waitUntil: 'domcontentloaded' })
  await page.bringToFront()
  await page.locator('.latex-editor').fill('a^2 + b^2')
  await targetPage.bringToFront()
  await page.evaluate(() => {
    document.querySelector('.extension-insert-button')?.click()
  })
  const permissionPrompt = page.locator('.extension-permission-prompt')
  await permissionPrompt.waitFor({ timeout: 10_000 })
  await permissionPrompt.getByText('Site access is required before inserting a formula.').waitFor()
  const targetOriginPattern = `${new URL(targetUrl).origin}/*`
  assert.equal(
    await page.evaluate(
      async (origin) => chrome.permissions.contains({ origins: [origin] }),
      targetOriginPattern,
    ),
    false,
    'The test site should start without optional host access.',
  )
  await page.screenshot({
    path: path.resolve('artifacts/extension-site-access.png'),
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
        interfaceScale: 110,
        editorFontSize: 18,
        quickCategoryColumns: categoryColumnCount,
        templateCategoryColumns: templateCategoryColumnCount,
        quickToolHoverPanel: true,
        templateHoverPanel: true,
        settingsAlwaysOpensSimpleDialog: true,
        siteAccessPrompt: true,
        toolPanelInternalScroll: false,
        sidepanelWidth: 480,
        sidepanelOverflow: false,
        screenshots: [
          'artifacts/extension-sidepanel.png',
          'artifacts/extension-template-categories.png',
          'artifacts/extension-template-hover.png',
          'artifacts/extension-options.png',
          'artifacts/extension-site-access.png',
        ],
      },
      null,
      2,
    ),
  )
} finally {
  await context.close()
  await new Promise((resolve) => targetServer.close(resolve))
  await fsPromises.rm(profileDir, { recursive: true, force: true }).catch(() => {})
}
