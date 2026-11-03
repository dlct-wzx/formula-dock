import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { promises as fsPromises } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import katex from 'katex'
import MathJax from 'mathjax'

const root = path.resolve('.')
const tscPath = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const tempDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'formuladock-formula-audit-'))

let quickTools
let formulaTemplates

try {
  execFileSync(
    process.execPath,
    [
      tscPath,
      'src/data/quickTools.ts',
      'src/data/formulaTemplates.ts',
      '--ignoreConfig',
      '--outDir',
      tempDir,
      '--target',
      'ES2022',
      '--module',
      'ESNext',
      '--skipLibCheck',
    ],
    { cwd: root, stdio: 'pipe' },
  )
  quickTools = await import(pathToFileURL(path.join(tempDir, 'quickTools.js')).href)
  formulaTemplates = await import(pathToFileURL(path.join(tempDir, 'formulaTemplates.js')).href)
} finally {
  await fsPromises.rm(tempDir, { recursive: true, force: true })
}

const quickItems = quickTools.quickToolCategories.flatMap((category) =>
  category.groups.flatMap((group) =>
    group.items.map((item) => ({
      ...item,
      category: category.id,
      group: group.title,
      preview: item.previewLatex ?? item.latex,
    })),
  ),
)

await MathJax.init({
  loader: {
    load: ['input/tex', 'output/svg'],
    paths: { mathjax: pathToFileURL(path.join(root, 'node_modules', 'mathjax')).href },
  },
  startup: { typeset: false },
  tex: {
    macros: {
      RR: '\\mathbb{R}',
      NN: '\\mathbb{N}',
      ZZ: '\\mathbb{Z}',
    },
  },
  svg: { fontCache: 'local' },
})

test('all quick tools and formula templates render in KaTeX and MathJax 4', async () => {
  assert.equal(quickItems.length, 284)
  assert.equal(formulaTemplates.formulaTemplates.length, 60)

  const ids = new Set()
  const duplicateIds = []
  for (const item of quickItems) {
    if (ids.has(item.id)) duplicateIds.push(item.id)
    ids.add(item.id)
  }
  assert.deepEqual(duplicateIds, [], `Duplicate quick-tool IDs: ${duplicateIds.join(', ')}`)

  for (const item of quickItems) {
    if (item.label.includes('无穷')) {
      assert.match(item.latex, /\\infty/, `Infinity tool ${item.id} must use \\infty`)
      assert.doesNotMatch(
        item.latex,
        /(^|[^a-zA-Z])\\inf([^a-zA-Z]|$)/,
        `Infinity tool ${item.id} must not use \\inf`,
      )
    }
  }

  const misplacedInf = quickItems
    .filter(
      (item) =>
        /(^|[^a-zA-Z])\\inf([^a-zA-Z]|$)/.test(item.preview) && item.label !== '下确界',
    )
    .map((item) => item.id)
  assert.deepEqual(
    misplacedInf,
    [],
    `Only the infimum tool may use \\inf: ${misplacedInf.join(', ')}`,
  )

  const failures = []
  const validate = async (kind, id, latex, displayMode) => {
    assert.ok(latex.trim(), `${kind} ${id} has an empty formula`)
    try {
      katex.renderToString(latex, { throwOnError: true, strict: 'error', displayMode })
    } catch (error) {
      failures.push(`${kind}/${id}/katex: ${error.message}`)
    }

    try {
      const node = await MathJax.tex2svgPromise(latex, { display: displayMode })
      const svg = MathJax.startup.adaptor.serializeXML(node)
      if (svg.includes('data-mml-node="merror"') || svg.includes('<merror')) {
        failures.push(`${kind}/${id}/mathjax: merror`)
      }
    } catch (error) {
      failures.push(`${kind}/${id}/mathjax: ${error.message}`)
    }
  }

  for (const item of quickItems) {
    await validate('quick', item.id, item.preview, false)
  }
  for (const template of formulaTemplates.formulaTemplates) {
    await validate('template', template.id, template.latex, template.displayMode ?? true)
  }

  assert.deepEqual(failures, [], `Formula rendering failures:\n${failures.join('\n')}`)
})
