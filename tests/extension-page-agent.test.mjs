import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const browserCandidates = [
  process.env.BROWSER_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)
const executablePath = browserCandidates.find((candidate) => fs.existsSync(candidate))

test('extension page agent inserts into textarea and contenteditable', { skip: !executablePath }, async (t) => {
  const browser = await chromium.launch({ headless: true, executablePath })
  t.after(() => browser.close())
  const page = await browser.newPage()

  await page.setContent(`
    <textarea id="editor">abc</textarea>
    <div id="rich" contenteditable="true">hello world</div>
  `)
  await page.evaluate(() => {
    let listener = null
    Object.defineProperty(window, 'chrome', {
      configurable: true,
      value: {
        runtime: {
          id: 'test-extension',
          onMessage: {
            addListener(callback) {
              listener = callback
              window.__latexStudioTestListener = callback
            },
            removeListener(callback) {
              if (listener === callback) listener = null
            },
          },
        },
      },
    })
  })
  await page.addScriptTag({ path: path.resolve('extension/content/page-agent.js') })

  const textareaResult = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const editor = document.getElementById('editor')
        editor.focus()
        editor.setSelectionRange(3, 3)
        document.dispatchEvent(new Event('selectionchange'))
        window.__latexStudioPageAgentV1.listener(
          { type: 'LATEX_STUDIO_INSERT_TEXT', text: '$x+y$' },
          {},
          resolve,
        )
      }),
  )
  assert.equal(textareaResult.ok, true)
  assert.equal(await page.locator('#editor').inputValue(), 'abc$x+y$')

  const richResult = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const editor = document.getElementById('rich')
        editor.focus()
        const selection = window.getSelection()
        const range = document.createRange()
        range.setStart(editor.firstChild, 6)
        range.setEnd(editor.firstChild, 11)
        selection.removeAllRanges()
        selection.addRange(range)
        document.dispatchEvent(new Event('selectionchange'))
        window.__latexStudioPageAgentV1.listener(
          { type: 'LATEX_STUDIO_INSERT_TEXT', text: 'formula' },
          {},
          resolve,
        )
      }),
  )
  assert.equal(richResult.ok, true)
  assert.equal(await page.locator('#rich').innerText(), 'hello formula')
})
