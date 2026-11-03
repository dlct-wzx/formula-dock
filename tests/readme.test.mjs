import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = path.resolve('.')
const readmeFiles = ['README.md', 'README_ZH.md']
const developmentOnlyTerms = ['npm run', 'node_modules', '.agents/', 'extension-dist/', 'vite.config']

function localTargets(markdown) {
  const targets = new Set()
  for (const match of markdown.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) targets.add(match[1])
  for (const match of markdown.matchAll(/(?:src|href)="([^"]+)"/g)) targets.add(match[1])
  return [...targets]
}

test('README language guides are user-facing and have valid local links', () => {
  const english = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
  const chinese = fs.readFileSync(path.join(root, 'README_ZH.md'), 'utf8')

assert.ok(english.includes('href="README_ZH.md"'), 'English README must link to the Chinese guide.')
assert.ok(chinese.includes('href="README.md"'), 'Chinese README must link to the English guide.')

  for (const [file, markdown] of [
    ['README.md', english],
    ['README_ZH.md', chinese],
  ]) {
    const lowered = markdown.toLowerCase()
    for (const term of developmentOnlyTerms) {
      assert.ok(!lowered.includes(term.toLowerCase()), `${file} should not contain development-only term: ${term}`)
    }

    for (const target of localTargets(markdown)) {
      if (
        target.startsWith('http://') ||
        target.startsWith('https://') ||
        target.startsWith('#') ||
        target.startsWith('../../releases/')
      ) {
        continue
      }
      if (target.startsWith('../../issues')) continue
      const withoutAnchor = target.split('#')[0]
      assert.ok(
        fs.existsSync(path.join(root, withoutAnchor)),
        `${file} references a missing local file: ${target}`,
      )
    }
  }
})
