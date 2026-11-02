import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { unzipSync } from 'fflate'

const root = path.resolve('.')
const outputDir = path.join(root, 'extension-dist')
const manifestPath = path.join(outputDir, 'manifest.json')

assert.ok(fs.existsSync(manifestPath), 'extension-dist/manifest.json is missing. Run build:extension.')
const manifest = JSON.parse(await fsPromises.readFile(manifestPath, 'utf8'))

assert.equal(manifest.manifest_version, 3)
assert.ok(manifest.name, 'manifest name is required')
assert.ok(manifest.version, 'manifest version is required')
assert.equal(manifest.background.service_worker, 'background.js')
assert.equal(manifest.side_panel.default_path, 'sidepanel.html')
assert.equal(manifest.options_ui.page, 'options.html')
assert.ok(manifest.permissions.includes('declarativeNetRequestWithHostAccess'))
assert.ok(manifest.permissions.includes('activeTab'))
assert.ok(manifest.permissions.includes('scripting'))
assert.ok(manifest.permissions.includes('sidePanel'))
assert.ok(manifest.permissions.includes('storage'))
assert.deepEqual(
  [...manifest.host_permissions].sort(),
  [
    'https://*.aliyuncs.com/*',
    'https://*.openxlab.org.cn/*',
    'https://mineru.net/api/v4/*',
  ],
  'Extension host permissions must remain limited to the three MinerU infrastructure patterns.',
)
assert.ok(!manifest.host_permissions.includes('<all_urls>'))
const backgroundSource = await fsPromises.readFile(path.join(outputDir, 'background.js'), 'utf8')
for (const marker of [
  'LATEX_STUDIO_MINERU_API_REQUEST',
  'LATEX_STUDIO_MINERU_UPLOAD',
  'LATEX_STUDIO_MINERU_DOWNLOAD_ZIP',
]) {
  assert.ok(backgroundSource.includes(marker), `Background proxy is missing ${marker}`)
}

const requiredFiles = [
  'background.js',
  'sidepanel.html',
  'options.html',
  'options.js',
  'options.css',
  'README.md',
  'LICENSE',
  'NOTICE',
  'THIRD_PARTY_NOTICES.md',
  'PRIVACY.md',
  'content/page-agent.js',
  'icons/icon16.png',
  'icons/icon32.png',
  'icons/icon48.png',
  'icons/icon128.png',
]
for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(outputDir, file)), `Missing extension file: ${file}`)
}

const sidepanelHtml = await fsPromises.readFile(path.join(outputDir, 'sidepanel.html'), 'utf8')
assert.match(sidepanelHtml, /<script[^>]+src="\/assets\//, 'sidepanel.html must load the built Vite bundle')
assert.doesNotMatch(sidepanelHtml, /\/src\/main\.tsx/, 'sidepanel.html must not reference Vite source entry')

for (const script of ['background.js', 'options.js', 'content/page-agent.js']) {
  execFileSync(process.execPath, ['--check', path.join(outputDir, script)], { stdio: 'pipe' })
}

const forbidden = ['server', 'node_modules', '.env', '.env.local']
for (const name of forbidden) {
  assert.ok(!fs.existsSync(path.join(outputDir, name)), `Forbidden path packaged: ${name}`)
}

async function collectFileBuffers(directory, output = []) {
  const entries = await fsPromises.readdir(directory, { withFileTypes: true })
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) await collectFileBuffers(absolute, output)
    else if (entry.isFile()) output.push(await fsPromises.readFile(absolute))
  }
  return output
}

const envLocalPath = path.join(root, '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envText = await fsPromises.readFile(envLocalPath, 'utf8')
  const token = envText.match(/^\s*MINERU_API_TOKEN\s*=\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim()
  if (token && token.length >= 8) {
    const tokenBytes = Buffer.from(token)
    const packagedBuffers = await collectFileBuffers(outputDir)
    assert.ok(
      packagedBuffers.every((buffer) => !buffer.includes(tokenBytes)),
      'MinerU token was found inside the packaged extension.',
    )
  }
}
const zipPath = path.join(
  root,
  'release',
  `latexlive-studio-extension-v${manifest.version}.zip`,
)
assert.ok(fs.existsSync(zipPath), 'Extension zip is missing.')
const zipFiles = unzipSync(new Uint8Array(await fsPromises.readFile(zipPath)))
assert.ok(zipFiles['manifest.json'], 'Zip must contain manifest.json at its root')
assert.ok(zipFiles['sidepanel.html'], 'Zip must contain sidepanel.html at its root')
assert.ok(zipFiles['background.js'], 'Zip must contain background.js at its root')

console.log(
  JSON.stringify(
    {
      status: 'passed',
      manifestVersion: manifest.manifest_version,
      extensionVersion: manifest.version,
      packagedFiles: Object.keys(zipFiles).length,
      zipPath,
    },
    null,
    2,
  ),
)
