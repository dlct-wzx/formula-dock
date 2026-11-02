import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const projectRoot = path.resolve(currentDir, '..')
export const distDir = path.join(projectRoot, 'dist')

function parseEnv(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, '').trim()
    if (!line || line.startsWith('#')) continue

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue

    let value = rawValue.trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '').trim()
    }

    process.env[key] = value
  }
}

export function loadLocalEnv() {
  for (const fileName of ['.env.local', '.env']) {
    const filePath = path.join(projectRoot, fileName)
    if (!fs.existsSync(filePath)) continue
    parseEnv(fs.readFileSync(filePath, 'utf8'))
  }
}

export function getRuntimeConfig() {
  const token = process.env.MINERU_API_TOKEN?.trim() || ''
  const requestedMockMode = process.env.MINERU_MOCK_MODE?.trim().toLowerCase()
  const mockMode = requestedMockMode === 'true' || (requestedMockMode !== 'false' && !token)

  return {
    port: Number(process.env.PORT || 8787),
    mineruToken: token,
    mineruMockMode: mockMode,
    mineruModel: process.env.MINERU_MODEL_VERSION === 'pipeline' ? 'pipeline' : 'vlm',
    mineruLanguage: process.env.MINERU_LANGUAGE?.trim() || 'ch',
  }
}
