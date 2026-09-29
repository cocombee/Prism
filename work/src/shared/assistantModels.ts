export type AssistantProvider = 'omniroute' | 'openai' | 'anthropic' | 'google' | 'deepseek' | 'moonshot'

import { modelDisplayName } from './modelNames'

export interface AssistantModelOption {
  id: string
  label: string
}

const NON_TEXT_ASSISTANT_SEMANTICS = /\b(?:audio|realtime|speech|voice|tts|text[ -]?to[ -]?speech|transcription|transcribe|whisper|sound|music)\b/i

export function isTextAssistantModelEligible(model: AssistantModelOption): boolean {
  return !NON_TEXT_ASSISTANT_SEMANTICS.test(`${model.id.replace(/[\/_-]+/g, ' ')} ${model.label.replace(/[\/_-]+/g, ' ')}`)
}

function releaseKey(id: string): string {
  return id.toLowerCase()
    .replace(/^[^/]+\//, '')
    .replace(/-(?:ultra|max|xhigh|high|medium|low|thinking)$/i, '')
    .replace(/-20\d{6}$/i, '')
}

function releaseScore(model: AssistantModelOption): number[] {
  const text = `${model.id.replace(/^[^/]+\//, '')} ${model.label}`.toLowerCase()
  const version = text.match(/(?:gpt|gemini|claude|deepseek|kimi)[^\d]*(\d+)(?:[.-](\d{1,2}))?(?:[.-](\d{1,2}))?/i)
  const date = Number(text.match(/\b(20\d{6})\b/)?.[1] || 0)
  const tier = /\bsol\b/.test(text) ? 90
    : /\bterra\b/.test(text) ? 80
      : /\bluna\b/.test(text) ? 70
        : /\bopus\b/.test(text) ? 60
          : /\bsonnet\b/.test(text) ? 50
            : /\bfable\b/.test(text) ? 45
              : /\bhaiku\b/.test(text) ? 40
                : /\bpro\b/.test(text) ? 30
                  : /\bflash\b/.test(text) ? 20 : 0
  return [Number(version?.[1] || 0), Number(version?.[2] || 0), Number(version?.[3] || 0), tier, date]
}

function compareRelease(left: AssistantModelOption, right: AssistantModelOption): number {
  const a = releaseScore(left)
  const b = releaseScore(right)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if ((a[index] || 0) !== (b[index] || 0)) return (b[index] || 0) - (a[index] || 0)
  }
  return left.id.localeCompare(right.id)
}

export function latestModelReleases(available: AssistantModelOption[], limit = 3): AssistantModelOption[] {
  const seen = new Set<string>()
  const selected: AssistantModelOption[] = []
  for (const model of available.filter(isTextAssistantModelEligible).sort(compareRelease)) {
    const key = releaseKey(model.id)
    if (seen.has(key)) continue
    seen.add(key)
    selected.push({ id: model.id, label: modelDisplayName(model.id, model.label) })
    if (selected.length >= limit) break
  }
  return selected
}

export function curatedAssistantModels(provider: AssistantProvider, available: AssistantModelOption[]): AssistantModelOption[] {
  return provider === 'omniroute' ? available : latestModelReleases(available, 3)
}
