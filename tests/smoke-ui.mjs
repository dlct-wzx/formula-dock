import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8787'
const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
assert.ok(executablePath, 'No Edge/Chrome executable found. Set BROWSER_PATH.')

const artifactsDir = path.resolve('artifacts')
await fsPromises.mkdir(artifactsDir, { recursive: true })

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

const browser = await chromium.launch({ headless: true, executablePath })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
const failedResponses = []

page.on('console', (message) => {
  if (message.type() !== 'error') return
  const location = message.location()
  consoleErrors.push(`${message.text()} @ ${location.url || 'unknown'}:${location.lineNumber ?? 0}`)
})
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
})

const editor = page.locator('textarea[aria-label="LaTeX 源码编辑器"]')

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /公式，不止于/ }).waitFor()
  assert.equal((await page.locator('.site-footer').innerText()).includes('.agents/'), false)

  await page.getByRole('tab', { name: /快捷工具/ }).click()
  await page.getByPlaceholder('搜索符号、名称或 LaTeX 命令').fill('积分')
  await page.locator('.quick-search-results .quick-item').first().waitFor()
  await page.getByPlaceholder('搜索符号、名称或 LaTeX 命令').fill('')
  await page.locator('.quick-category__toggle').first().hover()
  const quickHoverPanel = page.locator('.quick-hover-panel')
  await quickHoverPanel.waitFor({ state: 'visible' })
  await quickHoverPanel.getByText('二元运算符').waitFor()
  await page.waitForTimeout(220)
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-quick-tools.png'),
    fullPage: true,
  })
  assert.equal(await page.locator('.quick-category__body').count(), 0)
  assert.equal(await page.locator('.quick-category--open').count(), 0)
  assert.equal(
    await page.locator('.quick-category__toggle').first().evaluate((element) => element.tagName),
    'DIV',
  )
  await page.locator('.quick-category__toggle').first().click()
  await page.mouse.move(0, 0)
  await quickHoverPanel.waitFor({ state: 'detached' })
  assert.equal(await page.locator('.quick-category__body').count(), 0)
  assert.equal(await page.locator('.quick-category--open').count(), 0)
  const quickKatexErrors = []
  const quickCategoryCount = await page.locator('.quick-category__toggle').count()
  for (let index = 0; index < quickCategoryCount; index += 1) {
    await page.locator('.quick-category__toggle').nth(index).hover()
    await quickHoverPanel.waitFor({ state: 'visible' })
    await page.waitForTimeout(60)
    quickKatexErrors.push(
      ...(await page.locator('.quick-hover-panel .quick-item:has(.katex-error)').evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('title') || node.textContent || 'unknown quick item'),
      )),
    )
  }
  assert.deepEqual(quickKatexErrors, [], `Quick tool KaTeX errors: ${quickKatexErrors.join(' | ')}`)
  await page.locator('.quick-category__toggle').first().hover()
  await quickHoverPanel.waitFor({ state: 'visible' })
  await page.locator('button[title^="加 ·"]').first().click()
  assert.ok((await editor.inputValue()).includes('+'), 'Quick tool was not inserted.')
  await page.locator('.preview-math .katex').waitFor()
  assert.equal(
    await page.locator('.preview-surface').evaluate((element) => getComputedStyle(element).overflowY),
    'visible',
    'The output preview must not create an internal scrollbar.',
  )
  const shortPreviewHeight = await page.locator('.preview-surface').evaluate((element) => element.clientHeight)
  const alignedRows = Array.from({ length: 28 }, (_, index) => `x_{${index + 1}} &= ${index + 1}`).join('\\\\')
  await editor.fill(`\\begin{aligned}${alignedRows}\\end{aligned}`)
  await page.locator('.preview-math .katex').waitFor()
  await page.waitForTimeout(120)
  const tallPreviewHeight = await page.locator('.preview-surface').evaluate((element) => element.clientHeight)
  assert.ok(
    tallPreviewHeight > shortPreviewHeight,
    `Expected output content to grow the preview (${shortPreviewHeight}px -> ${tallPreviewHeight}px).`,
  )
  await editor.fill('x^2')

  await page.getByRole('tab', { name: /公式模板/ }).click()
  await page.getByPlaceholder('搜索公式名称、标签或描述').fill('高斯')
  await page.locator('.template-card').filter({ hasText: '高斯积分' }).waitFor()
  await page.getByPlaceholder('搜索公式名称、标签或描述').fill('')
  assert.equal(await page.locator('.template-category--active').count(), 0)
  assert.equal(
    await page.locator('.template-category__toggle').first().evaluate((element) => element.tagName),
    'DIV',
  )
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-templates.png'),
    fullPage: true,
  })
  await page.locator('.template-category__toggle').first().click()
  await page.mouse.move(0, 0)
  await page.locator('.template-hover-panel').waitFor({ state: 'detached' })
  assert.equal(await page.locator('.template-category--active').count(), 0)
  assert.equal(await page.locator('.template-card').count(), 0)
  await page.locator('.template-category__toggle').first().hover()
  const templateHoverPanel = page.locator('.template-hover-panel')
  await templateHoverPanel.waitFor({ state: 'visible' })
  await templateHoverPanel.getByText('一元二次方程求根公式', { exact: true }).waitFor()
  await page.waitForTimeout(220)
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-template-hover.png'),
    fullPage: true,
  })
  await page.mouse.move(0, 0)
  await templateHoverPanel.waitFor({ state: 'detached' })
  const templateKatexErrors = []
  const categoryCount = await page.locator('.template-category__toggle').count()
  for (let index = 0; index < categoryCount; index += 1) {
    await page.locator('.template-category__toggle').nth(index).hover()
    await templateHoverPanel.waitFor({ state: 'visible' })
    await page.waitForTimeout(60)
    templateKatexErrors.push(
      ...(await page
        .locator('.template-hover-card:has(.katex-error) > strong')
        .allTextContents()),
    )
  }
  assert.deepEqual(templateKatexErrors, [], `Template KaTeX errors: ${templateKatexErrors.join(' | ')}`)
  await page.locator('.template-category__toggle').filter({ hasText: '三角' }).hover()
  await templateHoverPanel.getByText('三角平方恒等式', { exact: true }).waitFor()
  await templateHoverPanel.getByText('三角平方恒等式', { exact: true }).click()
  const afterTemplate = await editor.inputValue()
  assert.ok(afterTemplate.includes(String.raw`\sin^2 x+\cos^2 x=1`), 'Template was not inserted.')

  await page.getByRole('tab', { name: /图片识别/ }).click()
  await page.locator('input[type="file"]').setInputFiles({
    name: 'formula-mock.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await page.getByRole('button', { name: '开始识别', exact: true }).click()
  await page.locator('.ocr-results').waitFor({ state: 'visible', timeout: 10_000 })
  const resultCards = page.locator('.ocr-formula-card')
  assert.ok((await resultCards.count()) >= 1, 'Mock OCR returned no formulas.')
  await resultCards.first().getByRole('button', { name: '插入', exact: true }).click()
  assert.ok((await editor.inputValue()).includes(String.raw`\int_{-\infty}`), 'OCR result was not inserted.')

  await page.getByRole('button', { name: '打开设置' }).click()
  const preferences = page.locator('.preferences-dialog')
  await preferences.waitFor()
  await preferences.locator('select').nth(0).selectOption('en')
  assert.equal(await preferences.locator('select').nth(1).locator('option[value="160"]').count(), 1)
  await preferences.locator('select').nth(1).selectOption('140')
  await preferences.locator('input[type="number"]').fill('18')
  await preferences.locator('.preferences-dialog__footer .button--primary').click()
  await page.getByRole('heading', { name: /Formulas, beyond/ }).waitFor()
  assert.equal(
    await page.locator('.latex-editor').evaluate((element) => getComputedStyle(element).fontSize),
    '18px',
  )
  assert.equal(
    await page.evaluate(() => document.documentElement.style.getPropertyValue('--ui-font-scale')),
    '1.4',
  )
  const interfaceFontSize = await page
    .locator('.tool-tab strong')
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))
  assert.ok(interfaceFontSize > 16, `Expected interface text to scale, got ${interfaceFontSize}px`)
  await page.getByRole('button', { name: 'Open settings' }).click()
  const reopenedPreferences = page.locator('.preferences-dialog')
  await reopenedPreferences.waitFor()
  assert.equal(await reopenedPreferences.locator('select').nth(1).inputValue(), '140')
  assert.equal(await reopenedPreferences.locator('input[type="number"]').inputValue(), '18')
  await reopenedPreferences.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-desktop.png'),
    fullPage: true,
  })

  await page.locator('.theme-button').last().click()
  assert.equal(
    await page.locator('html').getAttribute('data-theme'),
    'dark',
    'Theme toggle did not enable dark mode.',
  )
  await page.waitForTimeout(250)
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-dark.png'),
    fullPage: true,
  })
  await page.locator('.theme-button').last().click()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: /Formulas, beyond/ }).waitFor()
  const overflow = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }))
  assert.ok(
    overflow.documentWidth <= overflow.viewport + 1,
    `Mobile horizontal overflow: ${overflow.documentWidth}px > ${overflow.viewport}px`,
  )
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-mobile.png'),
    fullPage: true,
  })

  assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`)
  assert.deepEqual(consoleErrors, [], `Console errors: ${consoleErrors.join(' | ')}`)

  console.log(
    JSON.stringify(
      {
        status: 'passed',
        quickToolInsertion: true,
        templateInsertion: true,
        mockOcrInsertion: true,
        mobileOverflow: false,
        katexValidation: true,
        searchValidation: true,
        categoryClickState: false,
        quickToolHoverPanel: true,
        templateHoverPanel: true,
        interfaceSettings: true,
        englishLocale: true,
        interfaceScale: 140,
        editorFontSize: true,
        independentInterfaceAndEditorFontSizes: true,
        previewInternalScroll: false,
        previewGrowsWithContent: true,
        darkTheme: true,
        screenshots: [
          path.join(artifactsDir, 'smoke-quick-tools.png'),
          path.join(artifactsDir, 'smoke-templates.png'),
          path.join(artifactsDir, 'smoke-template-hover.png'),
          path.join(artifactsDir, 'smoke-desktop.png'),
          path.join(artifactsDir, 'smoke-dark.png'),
          path.join(artifactsDir, 'smoke-mobile.png'),
        ],
      },
      null,
      2,
    ),
  )
} catch (error) {
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-failure.png'),
    fullPage: true,
  }).catch(() => {})
  console.error(error)
  console.error({ consoleErrors, pageErrors, failedResponses })
  process.exitCode = 1
} finally {
  await browser.close()
}
