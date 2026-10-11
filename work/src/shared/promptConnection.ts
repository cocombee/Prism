import type { AssistantProvider } from './assistantModels'
import type { ServiceModelAvailability } from './types'

export type PromptBillingMode = 'api' | 'subscription'
/** Non-secret readiness only. Subscription credentials remain with the native provider runtime. */
export interface PromptConnectionView {
  provider: AssistantProvider
  mode: PromptBillingMode
  lease: string
  apiProfileId?: string
  ready: boolean
  label: string
  error?: string
  catalog?: ServiceModelAvailability
}
export interface PromptRewriteOptions { requestId: string; connectionLease: string }
export type SubscriptionProvider = 'openai' | 'anthropic' | 'google'
export const SUBSCRIPTION_PROVIDERS: readonly SubscriptionProvider[] = ['openai','anthropic','google']
export interface SubscriptionStatus { connected: boolean; accountId?: string; label?: string; error?: string }
export interface SubscriptionRewrite { text: string; instruction: string; model: string; expectedAccountId?: string; assertCurrent: () => void; signal?: AbortSignal }
export interface SubscriptionRuntime { status(): Promise<SubscriptionStatus>; login(): Promise<SubscriptionStatus>; models(): Promise<ServiceModelAvailability>; rewrite(request: SubscriptionRewrite): Promise<string> }
