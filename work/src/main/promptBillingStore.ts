import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import type { AssistantProvider } from '../shared/assistantModels'
import type { PromptBillingMode } from '../shared/promptConnection'

export interface PromptBillingChoice { mode: PromptBillingMode; accountId?: string; updatedAt?: string }
interface Registry { schemaVersion: 1; choices: Record<string, PromptBillingChoice> }
const providers = new Set(['omniroute','openai','anthropic','google','deepseek','moonshot'])
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
function key(provider: AssistantProvider, apiProfileId?: string): string {
  if (!providers.has(provider) || apiProfileId !== undefined && (typeof apiProfileId !== 'string' || !apiProfileId.length || apiProfileId.length > 200)) throw new Error('Invalid prompt account scope.')
  return JSON.stringify([provider, apiProfileId ?? null])
}
function parse(raw: string): Registry {
  let value: unknown
  try { value = JSON.parse(raw) } catch { throw new Error('Revamp billing settings are unreadable. Repair the settings before sending a request; no billing fallback was selected.') }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Revamp billing settings.')
  const registry = value as Registry
  if (registry.schemaVersion !== 1 || !registry.choices || typeof registry.choices !== 'object' || Array.isArray(registry.choices) || Object.keys(registry.choices).length > 256) throw new Error('Unsupported Revamp billing settings.')
  const choices: Registry['choices'] = Object.create(null)
  for (const [scope, choice] of Object.entries(registry.choices)) {
    let parts: unknown
    try { parts = JSON.parse(scope) } catch { throw new Error('Invalid Revamp billing account scope.') }
    if (!Array.isArray(parts) || parts.length !== 2 || key(parts[0], parts[1] === null ? undefined : parts[1]) !== scope) throw new Error('Invalid Revamp billing account scope.')
    if (!choice || typeof choice !== 'object' || Array.isArray(choice) || !['api','subscription'].includes(choice.mode) || choice.updatedAt !== undefined && (typeof choice.updatedAt !== 'string' || !Number.isFinite(Date.parse(choice.updatedAt)))) throw new Error('Invalid Revamp billing choice.')
    if (choice.mode === 'subscription' && (!['openai','anthropic','google'].includes(parts[0]) || choice.accountId !== undefined && (typeof choice.accountId !== 'string' || !/^[a-f0-9]{64}$/.test(choice.accountId)))) throw new Error('Invalid subscription account binding.')
    if (choice.mode === 'api' && choice.accountId !== undefined) throw new Error('Invalid API billing choice.')
    choices[scope] = { mode: choice.mode, ...(choice.accountId ? { accountId: choice.accountId } : {}), ...(choice.updatedAt ? { updatedAt: choice.updatedAt } : {}) }
  }
  return { schemaVersion: 1, choices }
}

/** Billing follows the existing selected API profile/default/project rules, without changing media credentials. */
export class PromptBillingStore {
  private mutation: Promise<unknown> = Promise.resolve()
  constructor(private readonly dataRoot: string) {}
  private async registry(): Promise<Registry> {
    let raw: string
    try { raw = await readFile(join(this.dataRoot, 'prompt-connections.json'), 'utf8') }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { schemaVersion: 1, choices: Object.create(null) }; throw error }
    if (Buffer.byteLength(raw) > 128 * 1024) throw new Error('Revamp billing settings exceed the supported limit.')
    return parse(raw)
  }
  async read(provider: AssistantProvider, apiProfileId?: string): Promise<{ choice: PromptBillingChoice; fingerprint: string }> {
    await this.mutation
    const scope = key(provider, apiProfileId), registry = await this.registry()
    // A new/migrated API profile inherits the provider choice instead of silently reverting subscription billing.
    const choice = registry.choices[scope] || registry.choices[key(provider)] || { mode: 'api' as const }
    return { choice: { ...choice }, fingerprint: hash(JSON.stringify([scope, choice])) }
  }
  async set(provider: AssistantProvider, apiProfileId: string | undefined, mode: PromptBillingMode, accountId?: string, assertCurrent: () => void = () => undefined): Promise<void> {
    const scope = key(provider, apiProfileId)
    const work = this.mutation.catch(() => undefined).then(async () => {
      assertCurrent()
      const registry = await this.registry()
      const choice: PromptBillingChoice = { mode, ...(accountId ? { accountId } : {}), updatedAt: new Date().toISOString() }
      registry.choices[scope] = choice
      registry.choices[key(provider)] = choice
      const checked = parse(JSON.stringify(registry))
      const raw = JSON.stringify(checked, null, 2) + '\n'
      if (Buffer.byteLength(raw) > 128 * 1024) throw new Error('Revamp billing settings exceed the supported limit.')
      await mkdir(this.dataRoot, { recursive: true })
      const temporary = join(this.dataRoot, `.prompt-connections-${randomUUID()}.next`)
      try {
        const file = await open(temporary, 'wx', 0o600)
        try { await file.writeFile(raw); await file.sync() } finally { await file.close() }
        assertCurrent()
        await rename(temporary, join(this.dataRoot, 'prompt-connections.json'))
      } finally { await unlink(temporary).catch(error => { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }) }
    })
    this.mutation = work.catch(() => undefined)
    await work
  }
}
