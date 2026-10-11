import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { access, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import type { ServiceModelAvailability } from '../shared/types'
import type { Readable, Writable } from 'node:stream'

export interface ClaudeSubscriptionStatus { connected: boolean; accountId?: string; label?: string; error?: string }
export interface ClaudeSubscriptionRewrite { text: string; instruction: string; model: string; expectedAccountId?: string; assertCurrent: () => void; signal?: AbortSignal }
interface Child { pid?: number; stdin: Writable; stdout: Readable; stderr: Readable; on(event: string, listener: (...args: any[]) => void): unknown; kill(signal?: NodeJS.Signals): boolean }
export interface ClaudeSubscriptionDependencies {
  env: NodeJS.ProcessEnv
  configurationDirectory?: string
  executable: (path: string) => Promise<void>
  realpath: (path: string) => Promise<string>
  makeDirectory: (prefix: string) => Promise<string>
  writePolicy: (path: string, content: string) => Promise<void>
  removeDirectory: (path: string) => Promise<void>
  spawn: (file: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; shell: false; detached: boolean; stdio: 'pipe' }) => Child
  kill: (child: Child) => void
  temporaryRoot: string
  home: string
  timeoutMs: number
  loginTimeoutMs: number
  outputLimit: number
}
const defaults: ClaudeSubscriptionDependencies = {
  env: process.env,
  executable: path => access(path, constants.X_OK), realpath,
  makeDirectory: mkdtemp,
  writePolicy: (path, content) => writeFile(path, content, { encoding: 'utf8', mode: 0o600 }),
  removeDirectory: path => rm(path, { recursive: true, force: true }),
  spawn: (file, args, options) => spawn(file, args, options),
  kill: child => { try { if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, 'SIGKILL'); else child.kill('SIGKILL') } catch { try { child.kill('SIGKILL') } catch { /* already exited */ } } },
  temporaryRoot: tmpdir(), home: homedir(), timeoutMs: 120_000, loginTimeoutMs: 300_000, outputLimit: 512 * 1024,
}
const safeEnvironmentKeys = ['HOME', 'PATH', 'USER', 'LOGNAME', 'SHELL', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TMPDIR', 'SystemRoot', 'WINDIR', 'DISPLAY', 'WAYLAND_DISPLAY', 'DBUS_SESSION_BUS_ADDRESS'] as const
function environment(deps: ClaudeSubscriptionDependencies): NodeJS.ProcessEnv {
  // Allowlist, not a blacklist: no API/cloud/gateway/billing overrides, custom loaders, or logging configuration.
  const clean: NodeJS.ProcessEnv = {}
  for (const key of safeEnvironmentKeys) if (typeof deps.env[key] === 'string') clean[key] = deps.env[key]
  clean.HOME ??= deps.home
  clean.PATH ??= '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin'
  if(deps.configurationDirectory)clean.CLAUDE_CONFIG_DIR=deps.configurationDirectory
  clean.CLAUDE_CODE_SAFE_MODE = '1'
  clean.CLAUDE_CODE_SKIP_PROMPT_HISTORY = '1'
  clean.DISABLE_TELEMETRY = '1'
  clean.DISABLE_ERROR_REPORTING = '1'
  return clean
}
function object(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function localError(message: string): Error { return new Error(message) }
function cancelled(): Error { const error = localError('Claude subscription request cancelled.'); error.name = 'AbortError'; return error }
// Explicit vendor requirements, not account entitlement or a guessed minimum for other models.
// https://code.claude.com/docs/en/model-config (verified 2026-10-09).
const modelMinimumPatch: Readonly<Record<string, number>> = {
  'claude-sonnet-5-5': 284,
  'claude-opus-5-5': 280,
  'claude-haiku-5-5': 293,
  'claude-fable-5-1': 257,
}

/**
 * Only the user's unmodified official CLI owns authentication; no token/key files are read here.
 * Contract: https://code.claude.com/docs/en/cli-reference and installed vendor 2.1.235 static auth/init/result shapes.
 * Safe mode retains administrator policy (including managed hooks); it is not a policy bypass or a no-I/O sandbox.
 */
export class ClaudeSubscriptionRuntime {
  private readonly deps: ClaudeSubscriptionDependencies
  private busy = false
  constructor(dependencies: Partial<ClaudeSubscriptionDependencies> = {}) { this.deps = { ...defaults, ...dependencies } }

  private async discover(env: NodeJS.ProcessEnv): Promise<string> {
    const home = env.HOME!, candidates = [...(env.PATH || '').split(delimiter).filter(isAbsolute).map(path => join(path, 'claude')), join(home, '.local/bin/claude'), join(home, '.npm-global/bin/claude'), '/opt/homebrew/bin/claude', '/usr/local/bin/claude']
    for (const path of new Set(candidates)) {
      try {
        await this.deps.executable(path)
        const native = await this.deps.realpath(path)
        // Known official npm/native install layouts; do not execute an arbitrary shell wrapper from PATH.
        if (/\/node_modules\/@anthropic-ai\/claude-code\/(?:cli\.js|bin\/claude(?:\.exe)?)$/.test(native) || /\/\.local\/share\/claude\/versions\/[^/]+$/.test(native)) return native
      } catch { /* continue ordinary local discovery */ }
    }
    throw localError('Install the official Claude Code CLI using its supported installer, then reconnect. No CLI was installed by Prism.')
  }

  private run(file: string, args: string[], cwd: string, env: NodeJS.ProcessEnv, options: { input?: string; signal?: AbortSignal; assertCurrent?: () => void; timeoutMs?: number; onLine?: (line: string) => void; collect?: boolean } = {}): Promise<{ code: number | null; stdout: string }> {
    options.assertCurrent?.()
    if (options.signal?.aborted) return Promise.reject(cancelled())
    return new Promise((resolve, reject) => {
      let child: Child
      try { child = this.deps.spawn(file, args, { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: 'pipe' }) }
      catch { reject(localError('Claude Code could not start. Review its installation and administrator policy.')); return }
      let ended = false, failure: unknown, stdout = '', pending = '', bytes = 0, stderrBytes = 0
      let reap: ReturnType<typeof setTimeout> | undefined
      const finish = (error?: unknown, code: number | null = null) => {
        if (ended) return
        ended = true; clearTimeout(timer); if (reap) clearTimeout(reap); options.signal?.removeEventListener('abort', abort)
        if (error) reject(error); else resolve({ code, stdout })
      }
      const stop = (error: unknown) => {
        if (ended || failure) return
        failure = error; this.deps.kill(child)
        if (!ended) reap = setTimeout(() => finish(failure), 1000)
      }
      const abort = () => stop(cancelled())
      const timer = setTimeout(() => stop(localError('Claude Code timed out. No provider or model fallback was attempted.')), options.timeoutMs ?? this.deps.timeoutMs)
      options.signal?.addEventListener('abort', abort, { once: true })
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk: Buffer | string) => {
        if (ended || failure) return
        bytes += Buffer.byteLength(chunk)
        if (bytes > this.deps.outputLimit) { stop(localError('Claude Code output exceeded the bounded response limit.')); return }
        const text = chunk.toString()
        if (options.collect !== false) stdout += text
        if (options.onLine) {
          pending += text
          try { for (;;) { const end = pending.indexOf('\n'); if (end < 0) break; const line = pending.slice(0, end); pending = pending.slice(end + 1); if (line.trim()) { options.assertCurrent?.(); options.onLine(line) } } }
          catch (error) { stop(error) }
        }
      })
      // Count and discard stderr; never return raw CLI stderr (it can contain a prompt, URL, or secret).
      child.stderr.on('data', (chunk: Buffer | string) => { stderrBytes += Buffer.byteLength(chunk); if (stderrBytes > 32 * 1024) stop(localError('Claude Code diagnostics exceeded the bounded limit.')) })
      child.on('error', () => finish(failure ?? localError('Claude Code failed locally. Review its installation and administrator policy.')))
      child.on('close', (code: number | null) => {
        if (!failure && options.onLine && pending.trim()) try { options.assertCurrent?.(); options.onLine(pending) } catch (error) { failure = error }
        finish(failure, code)
      })
      child.stdin.on('error', () => stop(localError('Claude Code could not accept the request input.')))
      if (options.signal?.aborted) { abort(); return }
      child.stdin.end(options.input ?? '')
    })
  }

  private async job<T>(work: (file: string, cwd: string, env: NodeJS.ProcessEnv) => Promise<T>, context: { signal?: AbortSignal; assertCurrent?: () => void; model?: string } = {}): Promise<T> {
    const env = environment(this.deps), cwd = await this.deps.makeDirectory(join(this.deps.temporaryRoot, 'prism-claude-subscription-'))
    try {
      const file = await this.discover(env)
      const version = await this.run(file, ['--version'], cwd, env, { ...context, timeoutMs: 15_000 })
      const match = /^(\d+)\.(\d+)\.(\d+)\s+\(Claude Code\)\s*$/.exec(version.stdout)
      if (version.code !== 0 || !match || Number(match[1]) !== 2 || Number(match[2]) !== 1 || Number(match[3]) < 235) throw localError('This Claude Code version does not have the verified subscription isolation contract. Update it using the official installer.')
      const minimum = context.model && modelMinimumPatch[context.model.replace(/\[1m\]$/, '')]
      if (minimum && Number(match[3]) < minimum) throw localError(`The selected model ${context.model} requires Claude Code 2.1.${minimum} or later according to the official model documentation. Update the official CLI using claude update or its supported installer before retrying. No account or inference command was attempted.`)
      const help = await this.run(file, ['--help'], cwd, env, { ...context, timeoutMs: 15_000 })
      // --system-prompt-file is documented but hidden from current --help output.
      if (help.code !== 0 || ['--safe-mode', '--tools', '--disallowedTools', '--no-session-persistence', '--permission-mode', '--system-prompt', '--output-format'].some(flag => !help.stdout.includes(flag))) throw localError('This Claude Code installation lacks the verified isolation options. No alternate invocation was attempted.')
      return await work(file, cwd, env)
    } finally { await this.deps.removeDirectory(cwd) }
  }

  private async readStatus(file: string, cwd: string, env: NodeJS.ProcessEnv, signal?: AbortSignal, assertCurrent?: () => void): Promise<ClaudeSubscriptionStatus> {
    const result = await this.run(file, ['auth', 'status'], cwd, env, { signal, assertCurrent, timeoutMs: 20_000 })
    let status: unknown
    try { status = JSON.parse(result.stdout) } catch { throw localError('Claude Code returned an unsupported authentication-status response.') }
    if (!object(status) || typeof status.loggedIn !== 'boolean') throw localError('Claude Code returned an unsupported authentication-status response.')
    if (!status.loggedIn) return { connected: false, error: 'Sign in with Claude Code to connect your Claude subscription.' }
    if (status.forcedLoginMethod !== undefined && status.forcedLoginMethod !== 'claudeai') return { connected: false, error: 'Administrator authentication policy does not permit this native Claude subscription route. Use an allowed provider mode; no policy override was attempted.' }
    if (result.code !== 0 || status.authMethod !== 'claude.ai' || status.apiProvider !== 'firstParty' || status.apiKeySource != null && status.apiKeySource !== 'none') return { connected: false, error: 'The active Claude Code authentication is not a verified native Claude subscription. API mode remains separate.' }
    if (!['pro', 'max', 'team', 'enterprise'].includes(String(status.subscriptionType)) || typeof status.email !== 'string' || !status.email.trim() || typeof status.orgId !== 'string' || !status.orgId.trim()) return { connected: false, error: 'Claude Code did not report a verifiable subscription account identity.' }
    return { connected: true, accountId: createHash('sha256').update(JSON.stringify([status.email, status.orgId])).digest('hex'), label: `Claude ${String(status.subscriptionType)[0].toUpperCase()}${String(status.subscriptionType).slice(1)}` }
  }

  async models(): Promise<ServiceModelAvailability> {
    return { provider:'anthropic', verified:false, catalogComplete:false, catalogSource:'Official Claude Code model identities; subscription entitlement checked on request.', models:[
      {id:'claude-sonnet-5-5',label:'Claude Sonnet 5.5'},
      {id:'claude-opus-5-5',label:'Claude Opus 5.5'},
      {id:'claude-haiku-5-5',label:'Claude Haiku 5.5'},
    ] }
  }
  async status(): Promise<ClaudeSubscriptionStatus> {
    try { return await this.job((file, cwd, env) => this.readStatus(file, cwd, env)) }
    catch { return { connected: false, error: 'Claude Code subscription status could not be verified. Review the official installation and administrator policy.' } }
  }

  async login(): Promise<ClaudeSubscriptionStatus> {
    if (this.busy) return { connected: false, error: 'Finish or cancel the current Claude subscription operation before signing in.' }
    this.busy = true
    try {
      return await this.job(async (file, cwd, env) => {
        // Original CLI browser authentication; no token capture, alternate OAuth flow, or --console restriction.
        const result = await this.run(file, ['auth', 'login', '--claudeai'], cwd, env, { collect: false, timeoutMs: this.deps.loginTimeoutMs })
        if (result.code !== 0) throw localError('Claude Code login did not complete.')
        return this.readStatus(file, cwd, env)
      })
    } catch { return { connected: false, error: 'Claude Code browser login did not complete. Use its normal supported login flow, then reconnect; administrator policy remains in force.' } }
    finally { this.busy = false }
  }

  async rewrite(request: ClaudeSubscriptionRewrite): Promise<string> {
    const expectedAccountId = request.expectedAccountId
    if (typeof request.text !== 'string' || !request.text.length || Buffer.byteLength(request.text) > 1024 * 1024 || typeof request.instruction !== 'string' || !request.instruction.trim() || Buffer.byteLength(request.instruction) > 1024 * 1024) throw localError('Provide bounded text and the shared rewrite instruction before using Claude subscription.')
    if (typeof request.model !== 'string' || !/^claude-[a-z0-9]+(?:-[a-z0-9]+)+(?:\[1m\])?$/.test(request.model) || request.model.length > 120) throw localError('Select an exact Claude model ID. Subscription mode does not silently resolve aliases or choose a fallback.')
    if (expectedAccountId !== undefined && (typeof expectedAccountId !== 'string' || !/^[a-f0-9]{64}$/.test(expectedAccountId))) throw localError('Reconnect the Claude subscription account before rewriting; its pinned identity is invalid.')
    request.assertCurrent(); if (request.signal?.aborted) throw cancelled()
    if (this.busy) throw localError('A Claude subscription operation is already running.')
    this.busy = true
    try {
      const output = await this.job(async (file, cwd, env) => {
        const before = await this.readStatus(file, cwd, env, request.signal, request.assertCurrent)
        if (!before.connected) throw localError(before.error!)
        if (expectedAccountId !== undefined && before.accountId !== expectedAccountId) throw localError('The pinned Claude subscription account changed before the rewrite. Reconnect before retrying; no inference was attempted.')
        request.assertCurrent()
        const policy = join(cwd, 'rewrite-policy.txt'); await this.deps.writePolicy(policy, request.instruction)
        let initialized = false, final: Record<string, unknown> | undefined
        const onLine = (line: string) => {
          let event: unknown
          try { event = JSON.parse(line) } catch { throw localError('Claude Code returned malformed structured output.') }
          if (!object(event) || final || event.is_error === true || event.type === 'error') throw localError('Claude Code did not return one fully successful structured rewrite.')
          if (event.type === 'system' && event.subtype === 'init') {
            if (initialized || event.model !== request.model || event.apiKeySource !== 'none' || event.permissionMode !== 'dontAsk' || !Array.isArray(event.tools) || event.tools.length || !Array.isArray(event.mcp_servers) || event.mcp_servers.length) throw localError('Claude Code changed the requested model, authentication, permissions, or isolated tool contract.')
            initialized = true
          } else if (event.type === 'assistant') {
            if (!initialized || !object(event.message) || event.message.model !== request.model || !Array.isArray(event.message.content) || event.message.content.some(block => !object(block) || !['text', 'thinking', 'redacted_thinking'].includes(String(block.type)))) throw localError('Claude Code attempted an unsupported response or model/tool fallback.')
          } else if (event.type === 'result') {
            if (!initialized || event.subtype !== 'success' || event.is_error !== false || event.num_turns !== 1 || event.stop_reason !== 'end_turn' || typeof event.result !== 'string' || !event.result.trim() || !object(event.modelUsage) || !Object.keys(event.modelUsage).length || Object.keys(event.modelUsage).some(model => model !== request.model) || !Array.isArray(event.permission_denials) || event.permission_denials.length) throw localError('Claude Code did not finish successfully on the exact selected model without tool denials.')
            final = event
          } else if (!['system', 'user', 'rate_limit_event'].includes(String(event.type))) throw localError('Claude Code returned an unsupported structured event; no fallback output was accepted.')
        }
        const result = await this.run(file, ['--safe-mode', '--print', '--output-format', 'stream-json', '--verbose', '--model', request.model, '--tools', '', '--disallowedTools', 'mcp__*', '--permission-mode', 'dontAsk', '--no-session-persistence', '--system-prompt-file', policy, '--max-turns', '1'], cwd, env, { input: request.text, signal: request.signal, assertCurrent: request.assertCurrent, onLine, collect: false })
        if (result.code !== 0 || !final) throw localError('Claude Code did not complete the structured rewrite. Review subscription limits or administrator policy; no API fallback was used.')
        const after = await this.readStatus(file, cwd, env, request.signal, request.assertCurrent)
        request.assertCurrent()
        if (!after.connected || after.accountId !== before.accountId) throw localError('The Claude subscription account changed during the rewrite. Its output was discarded.')
        return final.result as string
      }, { signal: request.signal, assertCurrent: request.assertCurrent, model: request.model })
      request.assertCurrent(); if (request.signal?.aborted) throw cancelled()
      return output
    } finally { this.busy = false }
  }
}
