import assert from 'node:assert/strict'
import fs from 'node:fs'
import { promises as fsPromises } from 'node:fs'

const requiredFiles = [
  'AGENTS.md',
  'README.md',
  '.agents/README.md',
  '.agents/project.yaml',
  '.agents/architecture.md',
  '.agents/tasks/backlog.yaml',
  '.agents/decisions/0001-runtime-stack.md',
  '.agents/decisions/0002-mineru-provider.md',
  '.agents/decisions/0003-static-formula-content.md',
  '.agents/decisions/0004-browser-extension-mv3.md',
  '.agents/playbooks/feature-change.md',
  '.agents/playbooks/chrome-web-store-release.md',
  '.agents/templates/handoff.md',
  '.agents/verification/2026-11-02-local.yaml',
  '.agents/verification/2026-11-02-extension.yaml',
  '.agents/verification/2026-11-02-extension-live.yaml',
  'scripts/prepare-mathjax-fonts.mjs',
  'extension/manifest.json',
  'LICENSE',
  'NOTICE',
  'PRIVACY.md',
  'SECURITY.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'CHANGELOG.md',
  'THIRD_PARTY_NOTICES.md',
  '.github/workflows/ci.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/pull_request_template.md',
  '.agents/decisions/0005-open-source-license.md',
  '.agents/decisions/0006-formuladock-rebrand.md',
  '.agents/decisions/0007-interface-preferences.md',
  '.agents/decisions/0008-site-access-and-adaptive-tools.md',
  '.agents/decisions/0009-hover-only-and-extension-scope.md',
  '.agents/decisions/0010-stacked-web-and-formula-scroll.md',
  '.agents/decisions/0011-extension-only-ocr.md',
  '.agents/decisions/0012-formula-image-export.md',
  '.agents/decisions/0013-latex-environment-menu.md',
  '.agents/decisions/0014-mathjax-renderer.md',
  '.agents/decisions/0015-default-mathjax.md',

  '.agents/verification/2026-11-02-open-source.yaml',
  '.agents/verification/2026-11-02-formuladock-rebrand.yaml',
  '.agents/verification/2026-11-02-ui-preferences.yaml',
  '.agents/verification/2026-11-02-extension-bugfixes.yaml',
  '.agents/verification/2026-11-03-hover-only-extension-scope.yaml',
  '.agents/verification/2026-11-03-stacked-web-formula-scroll.yaml',
  '.agents/verification/2026-11-03-extension-only-web-ocr.yaml',
  '.agents/verification/2026-11-03-formula-image-export.yaml',
  '.agents/verification/2026-11-03-environment-menu.yaml',
  '.agents/verification/2026-11-03-mathjax-renderer.yaml',
  '.agents/verification/2026-11-03-default-mathjax.yaml',

]

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(file), `Required agent file is missing: ${file}`)
}

const project = await fsPromises.readFile('.agents/project.yaml', 'utf8')
for (const key of ['project:', 'commands:', 'features:', 'constraints:', 'current_focus:']) {
  assert.ok(project.includes(key), `project.yaml is missing section: ${key}`)
}

const gitignore = await fsPromises.readFile('.gitignore', 'utf8')
assert.ok(gitignore.includes('.env.*'), '.env.* files must be ignored by Git.')
assert.ok(gitignore.includes('!.env.example'), '.env.example must remain publishable.')
assert.ok(
  gitignore.includes('latexlive-assistant-0.1.5/'),
  'The third-party reference extension must be ignored.',
)

const agents = await fsPromises.readFile('AGENTS.md', 'utf8')
for (const command of ['npm run dev', 'npm run verify', 'MINERU_API_TOKEN']) {
  assert.ok(agents.includes(command), `AGENTS.md must mention ${command}.`)
}

assert.ok(agents.includes('MathJax 4'), 'AGENTS.md must record the MathJax 4 renderer boundary.')
console.log(`Agent project check passed (${requiredFiles.length} required files).`)
