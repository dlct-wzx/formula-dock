import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'
import { zipSync } from 'fflate'

const root = path.resolve('.')
const distDir = path.join(root, 'dist')
const outputDir = path.join(root, 'extension-dist')
const releaseDir = path.join(root, 'release')
const extensionDir = path.join(root, 'extension')

function assertInsideWorkspace(target) {
  const resolved = path.resolve(target)
  assert.ok(
    resolved === root || resolved.startsWith(`${root}${path.sep}`),
    `Refusing to modify path outside workspace: ${resolved}`,
  )
}

async function collectFiles(directory, prefix = '') {
  const entries = await fsPromises.readdir(directory, { withFileTypes: true })
  const output = {}
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name)
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      Object.assign(output, await collectFiles(absolute, relative))
    } else if (entry.isFile()) {
      output[relative] = new Uint8Array(await fsPromises.readFile(absolute))
    }
  }
  return output
}

assert.ok(fs.existsSync(distDir), 'dist/ does not exist. Run Vite build first.')
assert.ok(fs.existsSync(extensionDir), 'extension/ does not exist.')
assertInsideWorkspace(outputDir)
assertInsideWorkspace(releaseDir)

await fsPromises.rm(outputDir, { recursive: true, force: true })
await fsPromises.rm(releaseDir, { recursive: true, force: true })
await fsPromises.mkdir(releaseDir, { recursive: true })

await fsPromises.cp(distDir, outputDir, { recursive: true })
await fsPromises.rename(
  path.join(outputDir, 'index.html'),
  path.join(outputDir, 'sidepanel.html'),
)

for (const file of ['manifest.json', 'background.js', 'options.html', 'options.js', 'options.css', 'README.md']) {
  await fsPromises.copyFile(path.join(extensionDir, file), path.join(outputDir, file))
}
for (const file of ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md']) {
  await fsPromises.copyFile(path.join(root, file), path.join(outputDir, file))
}
await fsPromises.cp(path.join(extensionDir, 'content'), path.join(outputDir, 'content'), {
  recursive: true,
})
await fsPromises.cp(path.join(extensionDir, 'icons'), path.join(outputDir, 'icons'), {
  recursive: true,
})

const manifest = JSON.parse(await fsPromises.readFile(path.join(outputDir, 'manifest.json'), 'utf8'))
assert.equal(manifest.manifest_version, 3)
assert.equal(manifest.side_panel.default_path, 'sidepanel.html')

const files = await collectFiles(outputDir)
const zip = zipSync(files, { level: 6 })
const zipPath = path.join(releaseDir, `formuladock-extension-v${manifest.version}.zip`)
await fsPromises.writeFile(zipPath, zip)

console.log(`Extension directory: ${outputDir}`)
console.log(`Extension package: ${zipPath}`)
console.log(`Packaged files: ${Object.keys(files).length}`)
