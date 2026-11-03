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


const browser = await chromium.launch({ headless: true, executablePath })
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
})
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
const failedResponses = []
const webOcrRequests = []
const externalMathJaxRequests = []

page.on('console', (message) => {
  if (message.type() !== 'error') return
  const location = message.location()
  consoleErrors.push(`${message.text()} @ ${location.url || 'unknown'}:${location.lineNumber ?? 0}`)
})
page.on('pageerror', (error) => pageErrors.push(error.message))
page.on('response', (response) => {
  if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`)
})
page.on('request', (request) => {
  if (/mathjax/i.test(request.url()) && !request.url().startsWith(BASE_URL)) externalMathJaxRequests.push(request.url())
  if (/\/api\/(?:ocr|health)(?:\/|$)/.test(new URL(request.url()).pathname)) {
    webOcrRequests.push(request.url())
  }
})

const editor = page.locator('textarea[aria-label="LaTeX 源码编辑器"]')

try {
  await page.goto(BASE_URL, { waitUntil: 'networkidle' })
  assert.equal(await page.locator('script[data-formuladock-mathjax]').count(), 0, 'MathJax must stay lazy until selected.')
  await page.getByRole('heading', { name: /公式，不止于/ }).waitFor()
  assert.equal((await page.locator('.site-footer').innerText()).includes('.agents/'), false)
  const workspaceLayout = await page.evaluate(() => {
    const grid = document.querySelector('.workspace-grid')
    const input = document.querySelector('.input-card')
    const output = document.querySelector('.output-card')
    if (!(grid instanceof HTMLElement) || !(input instanceof HTMLElement) || !(output instanceof HTMLElement)) {
      return null
    }
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length,
      stacked: output.getBoundingClientRect().top >= input.getBoundingClientRect().bottom - 1,
    }
  })
  assert.equal(workspaceLayout?.columns, 1, 'Web workspace must use a single-column layout.')
  assert.equal(workspaceLayout?.stacked, true, 'Output must be positioned below the input workspace.')

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
  assert.equal(await page.locator('.preview-scroll-hint').count(), 0)
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
  const wideFormula = Array.from(
    { length: 64 },
    (_, index) => `\\frac{x_{${index + 1}}}{y_{${index + 1}}}`,
  ).join('+')
  await editor.fill(wideFormula)
  await page.waitForTimeout(120)
  const horizontalOverflow = await page.locator('.preview-math').evaluate((element) => ({
    overflowX: getComputedStyle(element).overflowX,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    canScroll: (() => {
      element.scrollLeft = element.scrollWidth
      return element.scrollLeft > 0
    })(),
  }))
  assert.equal(horizontalOverflow.overflowX, 'scroll')
  assert.ok(
    horizontalOverflow.scrollWidth > horizontalOverflow.clientWidth,
    `Expected wide formula overflow: ${horizontalOverflow.scrollWidth}px <= ${horizontalOverflow.clientWidth}px`,
  )
  assert.equal(horizontalOverflow.canScroll, true, 'Wide formula should support horizontal scrolling.')
  await page.getByText('左右滑动查看完整公式').waitFor()
  await page.locator('.preview-surface').screenshot({
    path: path.join(artifactsDir, 'smoke-wide-formula.png'),
  })
  await editor.fill('x^2')
  await page.waitForTimeout(120)
  assert.equal(await page.locator('.preview-scroll-hint').count(), 0)

  await page.mouse.move(0, 0)
  await page.locator('.quick-hover-panel').waitFor({ state: 'detached' }).catch(() => {})
  const exportToastClose = page.locator('.toast__close')
  if (await exportToastClose.isVisible().catch(() => false)) await exportToastClose.click()
  const exportButton = page.getByRole('button', { name: '输出图片', exact: true })
  await exportButton.click()
  await page.getByRole('menu').waitFor()
  await page.mouse.click(20, 20)
  await page.getByRole('menu').waitFor({ state: 'detached' })
  await exportButton.click()
  await page.getByRole('menu').waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('menu').waitFor({ state: 'detached' })
  const exportFormats = [
    { format: 'svg', menuName: '导出为 SVG', signature: 'svg' },
    { format: 'png', menuName: '导出为 PNG', signature: 'png' },
    { format: 'jpg', menuName: '导出为 JPG', signature: 'jpg' },
  ]
  for (const [index, item] of exportFormats.entries()) {
    await exportButton.click()
    await page.getByRole('menu').waitFor()
    if (index === 0) {
      await page.screenshot({
        path: path.join(artifactsDir, 'smoke-image-export-menu.png'),
        fullPage: true,
      })
    }
    const downloadPromise = page.waitForEvent('download', { timeout: 15_000 })
    await page.getByRole('menuitem', { name: item.menuName, exact: true }).click()
    const download = await downloadPromise
    assert.match(download.suggestedFilename(), new RegExp(`\\.${item.format}$`))
    const exportPath = path.join(artifactsDir, `formula-export.${item.format}`)
    await download.saveAs(exportPath)
    const bytes = fs.readFileSync(exportPath)
    assert.ok(bytes.length > 1_000, `${item.format.toUpperCase()} export is unexpectedly small.`)
    if (item.signature === 'svg') {
      const svg = bytes.toString('utf8')
      assert.match(svg, /<svg[\s>]/i)
      assert.match(svg, /data:image\/png;base64,/i)
    } else {
      if (item.signature === 'png') {
        assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
      } else {
        assert.deepEqual([...bytes.subarray(0, 2)], [255, 216])
      }
      const imageFormat = item.signature === 'jpg' ? 'jpeg' : 'png'
      const dataUrl = `data:image/${imageFormat};base64,${bytes.toString('base64')}`
      const pixelStats = await page.evaluate(async (source) => {
        const image = new Image()
        image.src = source
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const context = canvas.getContext('2d')
        if (!context) return { visible: 0, transparent: 0 }
        context.drawImage(image, 0, 0)
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
        let visible = 0
        let transparent = 0
        for (let offset = 0; offset < pixels.length; offset += 4) {
          if (pixels[offset + 3] < 20) transparent += 1
          if (pixels[offset + 3] > 20 && (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245)) {
            visible += 1
          }
        }
        return { visible, transparent }
      }, dataUrl)
      assert.ok(pixelStats.visible > 100, `${item.format.toUpperCase()} export contains no visible formula pixels.`)
      if (item.format === 'png') {
        assert.ok(pixelStats.transparent > 100, 'PNG export background must be transparent.')
      }
    }
  }

  const environmentButton = page.getByRole('button', { name: '环境', exact: true })
  await editor.fill('x+y')
  await editor.evaluate((element) => {
    element.focus()
    element.setSelectionRange(0, 3)
  })
  const environmentToastClose = page.locator('.toast__close')
  if (await environmentToastClose.isVisible().catch(() => false)) await environmentToastClose.click()
  await environmentButton.click()
  const environmentMenu = page.locator('.environment-menu__list')
  await environmentMenu.waitFor()
  assert.equal(await environmentMenu.getByRole('menuitem').count(), 8)
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-environment-menu.png'),
    fullPage: true,
  })
  await environmentMenu.getByRole('menuitem', { name: 'align环境', exact: true }).click()
  assert.equal(
    await editor.inputValue(),
    '\\begin{align}\n  x+y\n\\end{align}',
    'Selected content was not wrapped in an align environment.',
  )

  await editor.fill('\\begin{align}\n  x+y\n\\end{align}')
  await environmentButton.click()
  await environmentMenu.getByRole('menuitem', { name: 'none环境', exact: true }).click()
  assert.equal(await editor.inputValue(), 'x+y', 'none environment did not unwrap the existing environment.')

  await editor.fill('')
  await environmentButton.click()
  await environmentMenu.getByRole('menuitem', { name: 'array环境', exact: true }).click()
  assert.match(await editor.inputValue(), /\\begin\{array\}\{c\}[\s\S]*\\end\{array\}/)
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
  const ocrNotice = page.locator('.ocr-extension-notice')
  await ocrNotice.waitFor()
  await ocrNotice.getByText('图片识别仅在浏览器扩展中提供').waitFor()
  await ocrNotice.getByText('配置自己的 API Key').waitFor()
  assert.equal(await page.locator('input[type="file"]').count(), 0)
  assert.equal(await page.locator('.ocr-dropzone').count(), 0)
  assert.deepEqual(webOcrRequests, [], `Web OCR boundary made network requests: ${webOcrRequests.join(' | ')}`)
  const toastClose = page.locator('.toast__close')
  if (await toastClose.isVisible().catch(() => false)) await toastClose.click()
  await page.screenshot({
    path: path.join(artifactsDir, 'smoke-ocr-extension-notice.png'),
    fullPage: true,
  })

  await page.getByRole('button', { name: '打开设置' }).click()
  const preferences = page.locator('.preferences-dialog')
  await preferences.waitFor()
  await preferences.locator('select').nth(0).selectOption('en')
  assert.equal(await preferences.locator('select').nth(1).locator('option[value="mathjax"]').count(), 1)
  await preferences.locator('select').nth(1).selectOption('mathjax')
  assert.equal(await preferences.locator('select').nth(2).locator('option[value="160"]').count(), 1)
  await preferences.locator('select').nth(2).selectOption('140')
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
  const multilineFormula = String.raw`\begin{eqnarray}
a &=& b + c \\
d &=& e + f \\
g &=& h + i
\end{eqnarray}`
  await page.locator('.latex-editor').fill(multilineFormula)
  const mathJaxPreview = page.locator(
    '.preview-math [data-math-renderer="mathjax"][data-math-status="ready"] mjx-container',
  )
  await mathJaxPreview.waitFor({ timeout: 20_000 })
  const mathJaxDetails = await page.locator('.preview-math').evaluate((element) => {
    const container = element.querySelector('mjx-container')
    const script = document.querySelector('script[data-formuladock-mathjax]')
    return {
      hasSvg: Boolean(container?.querySelector('svg')),
      rowCount: container?.querySelectorAll('g[data-mml-node="mtr"]').length ?? 0,
      scriptOrigin: script instanceof HTMLScriptElement ? new URL(script.src).origin : '',
      mathJaxScriptCount: document.querySelectorAll('script[data-formuladock-mathjax]').length,
      pageOrigin: window.location.origin,
    }
  })
  assert.equal(mathJaxDetails.hasSvg, true, 'MathJax must produce SVG output.')
  assert.ok(mathJaxDetails.rowCount >= 3, `Expected three MathJax rows, got ${mathJaxDetails.rowCount}`)
  assert.equal(mathJaxDetails.mathJaxScriptCount, 1, 'MathJax must load exactly once.')
  assert.deepEqual(externalMathJaxRequests, [], `MathJax made external requests: ${externalMathJaxRequests.join(' | ')}`)
  assert.equal(mathJaxDetails.scriptOrigin, mathJaxDetails.pageOrigin, 'MathJax must load locally.')
  const toastAfterSettings = page.locator('.toast__close')
  if (await toastAfterSettings.isVisible().catch(() => false)) await toastAfterSettings.click()
  await page.locator('.preview-surface').screenshot({
    path: path.join(artifactsDir, 'smoke-mathjax-multiline.png'),
  })

  const mathJaxExportButton = page.getByRole('button', { name: 'Export image', exact: true })
  await mathJaxExportButton.click()
  const mathJaxDownloadPromise = page.waitForEvent('download', { timeout: 15_000 })
  await page.getByRole('menuitem', { name: 'Export as PNG', exact: true }).click()
  const mathJaxDownload = await mathJaxDownloadPromise
  const mathJaxExportPath = path.join(artifactsDir, 'smoke-mathjax-export.png')
  await mathJaxDownload.saveAs(mathJaxExportPath)
  const mathJaxExportBytes = fs.readFileSync(mathJaxExportPath)
  assert.deepEqual([...mathJaxExportBytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
  assert.ok(mathJaxExportBytes.length > 1_000, 'MathJax PNG export is unexpectedly small.')
  const mathJaxDataUrl = `data:image/png;base64,${mathJaxExportBytes.toString('base64')}`
  const mathJaxPixelStats = await page.evaluate(async (source) => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) return { visible: 0, transparent: 0 }
    context.drawImage(image, 0, 0)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data
    let visible = 0
    let transparent = 0
    for (let offset = 0; offset < pixels.length; offset += 4) {
      if (pixels[offset + 3] < 20) transparent += 1
      if (pixels[offset + 3] > 20 && (pixels[offset] < 245 || pixels[offset + 1] < 245 || pixels[offset + 2] < 245)) visible += 1
    }
    return { visible, transparent }
  }, mathJaxDataUrl)
  assert.ok(mathJaxPixelStats.visible > 100, 'MathJax PNG export contains no visible formula pixels.')
  assert.ok(mathJaxPixelStats.transparent > 100, 'MathJax PNG export background must be transparent.')
  await page.getByRole('button', { name: 'Open settings' }).click()
  const reopenedPreferences = page.locator('.preferences-dialog')
  await reopenedPreferences.waitFor()
  assert.equal(await reopenedPreferences.locator('select').nth(1).inputValue(), 'mathjax')
  assert.equal(await reopenedPreferences.locator('select').nth(2).inputValue(), '140')
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
        webOcrExtensionNotice: true,
        webOcrUploadUnavailable: true,
        webOcrNetworkRequests: 0,
        mobileOverflow: false,
        katexValidation: true,
        searchValidation: true,
        categoryClickState: false,
        quickToolHoverPanel: true,
        templateHoverPanel: true,
        interfaceSettings: true,
        mathJaxRenderer: true,
        mathJaxLocalAssets: true,
        mathJaxMultilineRows: 3,
        mathJaxPreferencePersistence: true,
        mathJaxPngExport: true,
        englishLocale: true,
        interfaceScale: 140,
        editorFontSize: true,
        independentInterfaceAndEditorFontSizes: true,
        previewInternalScroll: false,
        previewGrowsWithContent: true,
        wideFormulaHorizontalScroll: true,
        conditionalHorizontalScrollHint: true,
        webWorkspaceStacked: true,
        environmentMenuOptions: 8,
        environmentWrapping: true,
        environmentUnwrap: true,
        imageExportFormats: ['svg', 'png', 'jpg'],
        pngTransparentBackground: true,
        jpgWhiteBackground: true,
        darkTheme: true,
        screenshots: [
          path.join(artifactsDir, 'smoke-quick-tools.png'),
          path.join(artifactsDir, 'smoke-templates.png'),
          path.join(artifactsDir, 'smoke-template-hover.png'),
          path.join(artifactsDir, 'smoke-wide-formula.png'),
          path.join(artifactsDir, 'smoke-ocr-extension-notice.png'),
          path.join(artifactsDir, 'smoke-image-export-menu.png'),
          path.join(artifactsDir, 'smoke-environment-menu.png'),
          path.join(artifactsDir, 'smoke-mathjax-multiline.png'),
          path.join(artifactsDir, 'smoke-mathjax-export.png'),
          path.join(artifactsDir, 'formula-export.svg'),
          path.join(artifactsDir, 'formula-export.png'),
          path.join(artifactsDir, 'formula-export.jpg'),
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
