import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const candidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = candidates.find((candidate) => fs.existsSync(candidate))
if (!executablePath) throw new Error('No Edge/Chrome executable found. Set BROWSER_PATH.')

const outputDir = path.resolve('extension/icons')
await fsPromises.mkdir(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath })
try {
  for (const size of [16, 32, 48, 128]) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 1,
    })
    await page.setContent(`
      <style>
        html,body{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}
        .icon{width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:24%;background:linear-gradient(145deg,#5d84ff,#2350dc);color:#fff;font-family:Georgia,'Times New Roman',serif;font-weight:700;line-height:1;padding-bottom:${Math.max(1, size * 0.02)}px;box-sizing:border-box;font-size:${size * 0.7}px}
      </style>
      <div class="icon">Σ</div>
    `)
    await page.locator('.icon').waitFor()
    await page.screenshot({
      path: path.join(outputDir, `icon${size}.png`),
      omitBackground: true,
    })
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('Generated extension icons: 16, 32, 48, 128')
