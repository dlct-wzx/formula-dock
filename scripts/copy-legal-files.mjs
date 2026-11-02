import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const dist = path.join(root, 'dist')
assert.ok(
  fs.existsSync(path.join(dist, 'index.html')),
  'dist/index.html is missing. Run Vite build first.',
)

const legalFiles = ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'PRIVACY.md']
for (const file of legalFiles) {
  const source = path.join(root, file)
  assert.ok(fs.existsSync(source), `Missing legal file: ${file}`)
  await fsPromises.copyFile(source, path.join(dist, file))
}

console.log(`Copied legal files to dist: ${legalFiles.join(', ')}`)
