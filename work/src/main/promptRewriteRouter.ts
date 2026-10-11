import { createHash } from 'node:crypto'
import type { AssistantProvider } from '../shared/assistantModels'
import { type PromptBillingMode, type PromptConnectionView, type PromptRewriteOptions } from '../shared/promptConnection'
import type { ServiceModelAvailability } from '../shared/types'
import type { SubscriptionRuntime, SubscriptionStatus, SubscriptionProvider } from '../shared/promptConnection'
import type { PromptBillingStore } from './promptBillingStore'

export interface PromptRequestOwner {
  provider: AssistantProvider
  projectScope: string
  apiProfileId?: string
  apiReady: boolean
  assertCurrent: () => void
}
export function prepareAssistantRewrite(text: unknown, instruction: unknown) {
  const source = typeof text === 'string' ? text.trim() : ''
  if (!source) throw new Error('Write a panel prompt first.')
  const direction = typeof instruction === 'string' && instruction.trim() ? instruction.trim() : 'Clarify only visible action and the selected camera movement. Preserve every other prompt detail.'
  const policy = `${direction}\n\nPreserve named characters, locations, actions, continuity facts, and duration. Return only the rewritten prompt.`
  const input = `Original prompt:\n${source}`
  if (Buffer.byteLength(source) > 1024 * 1024 || Buffer.byteLength(policy) > 1024 * 1024) throw new Error('The Revamp prompt exceeds the supported text limit.')
  return { source, policy, input, prompt: `${policy}\n\n${input}` }
}
interface Dependencies {
  store: Pick<PromptBillingStore, 'read' | 'set'>
  subscriptions: Partial<Record<SubscriptionProvider, SubscriptionRuntime>>
}
const cancelled = () => new DOMException('The prompt connection, account, project, or request changed. Its output was discarded.', 'AbortError')

/** One captured billing owner for every rewrite/batch. Never retries through another charging route. */
export class PromptRewriteRouter {
  private readonly revisions = new Map<AssistantProvider, number>()
  private readonly mutations = new Set<AssistantProvider>()
  private readonly requests = new Map<string, { provider: AssistantProvider; controller: AbortController }>()
  constructor(private readonly deps: Dependencies) {}
  private revision(provider: AssistantProvider) { return this.revisions.get(provider) || 0 }
  private async capture(owner: PromptRequestOwner) {
    owner.assertCurrent()
    if (this.mutations.has(owner.provider)) throw cancelled()
    const revision = this.revision(owner.provider)
    const stored = await this.deps.store.read(owner.provider, owner.apiProfileId)
    const assertCurrent = () => {
      owner.assertCurrent()
      if (this.mutations.has(owner.provider) || this.revision(owner.provider) !== revision) throw cancelled()
    }
    assertCurrent()
    const lease = createHash('sha256').update(JSON.stringify([owner.provider, owner.projectScope, owner.apiProfileId ?? null, revision, stored.fingerprint])).digest('hex')
    return { ...stored, lease, assertCurrent }
  }
  private async subscriptionStatus(provider: AssistantProvider, accountId: string | undefined): Promise<SubscriptionStatus> {
    if (!accountId) return { connected: false, error: 'Connect your subscription in this provider’s settings first.' }
    const runtime = this.deps.subscriptions[provider as SubscriptionProvider]
    if (!runtime) return {connected:false,error:'This provider has no supported subscription runtime.'}
    const status = await runtime.status()
    return status.connected && status.accountId !== accountId
      ? { connected: false, error: 'The native subscription account changed. Reconnect this subscription before revamping.' } : status
  }
  async view(owner: PromptRequestOwner): Promise<PromptConnectionView> {
    const captured = await this.capture(owner)
    const base = { provider: owner.provider, mode: captured.choice.mode, lease: captured.lease, apiProfileId: owner.apiProfileId }
    if (captured.choice.mode === 'api') return { ...base, ready: owner.apiReady, label: 'API', ...(!owner.apiReady ? { error: 'Connect an API account or choose an available subscription connection.' } : {}) }
    if (!this.deps.subscriptions[owner.provider as SubscriptionProvider]) return {...base,ready:false,label:'Subscription',error:'This provider has no supported subscription runtime.'}
    const status = await this.subscriptionStatus(owner.provider, captured.choice.accountId)
    captured.assertCurrent()
    let catalog: ServiceModelAvailability | undefined, error = status.error
    if (status.connected) {
      try { catalog = await this.deps.subscriptions[owner.provider as SubscriptionProvider]!.models() }
      catch { error = 'The subscription model catalog could not be verified. Saved model choices are preserved.' }
    }
    captured.assertCurrent()
    return { ...base, ready: Boolean(status.connected && catalog?.models.length), label: status.label || 'Subscription', error, catalog }
  }
  async configure(owner: PromptRequestOwner, mode: PromptBillingMode, signIn = false): Promise<PromptConnectionView> {
    owner.assertCurrent()
    if (!['api','subscription'].includes(mode)) throw new Error('Invalid Revamp billing choice.')
    const runtime = this.deps.subscriptions[owner.provider as SubscriptionProvider]
    if (mode === 'subscription' && !runtime) throw new Error('This provider has no supported subscription connection.')
    if (this.mutations.has(owner.provider)) throw new Error('A prompt connection change is already in progress.')
    this.mutations.add(owner.provider); this.revisions.set(owner.provider, this.revision(owner.provider) + 1)
    for (const request of this.requests.values()) if (request.provider === owner.provider) request.controller.abort()
    try {
      let accountId: string | undefined
      if (mode === 'subscription') {
        const status = signIn ? await runtime!.login() : await runtime!.status()
        owner.assertCurrent()
        if(signIn && (!status.connected || !status.accountId))throw new Error(status.error || 'The subscription connection could not be verified.')
        accountId = status.connected ? status.accountId : undefined
      }
      owner.assertCurrent()
      await this.deps.store.set(owner.provider, owner.apiProfileId, mode, accountId, owner.assertCurrent)
      owner.assertCurrent()
    } finally { this.mutations.delete(owner.provider); this.revisions.set(owner.provider, this.revision(owner.provider) + 1) }
    return this.view(owner)
  }
  cancel(requestId: string): boolean {
    const request = this.requests.get(requestId)
    if (!request) return false
    request.controller.abort(); return true
  }
  async rewrite(owner: PromptRequestOwner, text: unknown, instruction: unknown, model: unknown, options: PromptRewriteOptions, api: (prompt: string, model: string, signal: AbortSignal, assertCurrent: () => void) => Promise<string>): Promise<string> {
    const prepared = prepareAssistantRewrite(text, instruction)
    if (typeof model !== 'string' || !model.trim() || model.length > 200 || /[\r\n\0]/.test(model)) throw new Error('Choose an exact assistant model before revamping.')
    if (!options || typeof options.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(options.requestId) || typeof options.connectionLease !== 'string' || !/^[a-f0-9]{64}$/.test(options.connectionLease)) throw new Error('Invalid prompt request ownership.')
    if (this.requests.has(options.requestId)) throw new Error('That prompt request is already running.')
    if (this.requests.size >= 16) throw new Error('Too many prompt requests are running. Finish or cancel one first.')
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 120_000)
    this.requests.set(options.requestId, { provider: owner.provider, controller })
    try {
      const captured = await this.capture(owner)
      const assertCurrent = () => { captured.assertCurrent(); if (controller.signal.aborted) throw cancelled() }
      assertCurrent()
      if (captured.lease !== options.connectionLease) throw cancelled()
      let output: string
      if (captured.choice.mode === 'api') {
        if (!owner.apiReady) throw new Error('The selected API account is unavailable. No subscription fallback was used.')
        assertCurrent(); output = await api(prepared.prompt, model.trim(), controller.signal, assertCurrent)
      } else {
        if (!this.deps.subscriptions[owner.provider as SubscriptionProvider]) throw new Error('This provider has no supported subscription connection.')
        const status = await this.subscriptionStatus(owner.provider, captured.choice.accountId)
        assertCurrent()
        if (!status.connected) throw new Error(status.error!)
        const catalog = await this.deps.subscriptions[owner.provider as SubscriptionProvider]!.models()
        assertCurrent()
        if (!catalog.models.some(candidate => candidate.id === model.trim())) throw new Error('The selected model is unavailable through this subscription connection. Its saved selection was preserved; choose a supported model or API billing.')
        output = await this.deps.subscriptions[owner.provider as SubscriptionProvider]!.rewrite({ text: prepared.input, instruction: prepared.policy, model: model.trim(), expectedAccountId: captured.choice.accountId, signal: controller.signal, assertCurrent })
        const after = await this.subscriptionStatus(owner.provider, captured.choice.accountId)
        assertCurrent()
        if (!after.connected) throw new Error(after.error!)
      }
      assertCurrent()
      if (typeof output !== 'string' || !output.trim() || Buffer.byteLength(output) > 512 * 1024) throw new Error('The assistant returned an invalid rewritten prompt.')
      return output.trim()
    } finally { clearTimeout(timer); this.requests.delete(options.requestId) }
  }
}
