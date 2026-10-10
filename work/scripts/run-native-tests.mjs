import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// These macOS UI tests must not launch from a restricted process environment.
// In Codex use reviewed, unsandboxed execution; never retry a startup abort.
if (process.platform !== 'darwin') {
  console.error('Native Prism tests require a macOS desktop session. No Electron app was launched.')
  process.exit(1)
}
const probe = spawnSync('/bin/ps', ['-p', String(process.pid), '-o', 'pid='], {
  encoding: 'utf8',
  timeout: 5000,
})
if (probe.error || probe.status !== 0 || probe.stdout.trim() !== String(process.pid)) {
  console.error('Native Prism tests require unrestricted macOS process access. Use a reviewed desktop execution context. No Electron app was launched.')
  process.exit(1)
}
if (process.argv.includes('--check')) {
  console.log('Native-test preflight passed; no Electron app was launched.')
  process.exit(0)
}
const cli = fileURLToPath(new URL('../node_modules/vitest/vitest.mjs', import.meta.url))
const result = spawnSync(process.execPath, [cli, 'run', '--config', 'vitest.native.config.ts', ...process.argv.slice(2)], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  stdio: 'inherit',
})
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
