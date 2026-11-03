import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'
import path from 'node:path'

const root = path.resolve('.')
const source = path.join(
  root,
  'node_modules',
  '@mathjax',
  'mathjax-newcm-font',
  'svg',
  'dynamic',
)
const destination = path.join(root, 'public', 'mathjax-fonts', 'svg', 'dynamic')

assert.ok(fs.existsSync(source), 'MathJax NewCM dynamic font assets are missing. Run npm install.')
const resolvedDestination = path.resolve(destination)
assert.ok(
  resolvedDestination.startsWith(`${root}${path.sep}`),
  `Refusing to prepare fonts outside the workspace: ${resolvedDestination}`,
)

await fsPromises.rm(destination, { recursive: true, force: true })
await fsPromises.mkdir(destination, { recursive: true })
await fsPromises.cp(source, destination, { recursive: true })

const files = (await fsPromises.readdir(destination)).filter((name) => name.endsWith('.js'))
assert.ok(files.length > 0, 'No MathJax dynamic font scripts were prepared.')
console.log(`Prepared ${files.length} local MathJax font scripts in public/mathjax-fonts.`)
