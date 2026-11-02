import { spawn } from 'node:child_process'
import net from 'node:net'

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => resolve(port))
    })
  })
}

async function waitForServer(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return await response.json()
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Timed out waiting for ${url}`)
}

const port = await getFreePort()
const baseUrl = `http://127.0.0.1:${port}`
const server = spawn(process.execPath, ['server/index.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    PORT: String(port),
    MINERU_MOCK_MODE: 'true',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
server.stdout.on('data', (chunk) => {
  serverOutput += chunk.toString()
})
server.stderr.on('data', (chunk) => {
  serverOutput += chunk.toString()
})

function stopServer() {
  if (!server.killed) server.kill('SIGTERM')
}

process.on('SIGINT', () => {
  stopServer()
  process.exit(130)
})

try {
  const health = await waitForServer(`${baseUrl}/api/health`)
  if (health?.mineru?.mode !== 'mock') {
    throw new Error(`Expected isolated mock server, got mode: ${health?.mineru?.mode}`)
  }

  const testProcess = spawn(process.execPath, ['tests/smoke-ui.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, SMOKE_BASE_URL: baseUrl },
    stdio: 'inherit',
  })
  const exitCode = await new Promise((resolve) => testProcess.on('exit', resolve))
  if (exitCode !== 0) process.exitCode = exitCode || 1
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  if (serverOutput.trim()) console.error(serverOutput.trim())
  process.exitCode = 1
} finally {
  stopServer()
}
