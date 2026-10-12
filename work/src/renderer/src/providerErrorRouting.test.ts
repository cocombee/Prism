import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { generationExecutionIdentity, generationServiceProvider } from '../../shared/generationServiceProvider'
import { compactProviderError } from '../../shared/providerErrors'

const source = readFileSync(new URL('./NodeCardNext.tsx', import.meta.url), 'utf8')
const activationBody = 'The model or endpoint does not exist or you do not have access. Please go to the ModelArk console and activate the model.'

describe('next renderer generation error provider', () => {
  it('labels BytePlus Video errors with BytePlus while preserving the exact Ark body', () => {
    const provider = generationServiceProvider({ kind: 'video-generator', videoEngine: 'byteplus/seedance-2.5/text-to-video' })
    expect(compactProviderError(activationBody, provider)).toBe(`BytePlus Seedance: ${activationBody}`)
  })

  it('keeps fal Video errors attributed to fal.ai', () => {
    const provider = generationServiceProvider({ kind: 'video-generator', videoEngine: 'bytedance/seedance-2.5/text-to-video' })
    expect(compactProviderError(activationBody, provider)).toBe(`fal.ai: ${activationBody}`)
  })

  it('does not double-prefix an activation preflight error', () => {
    const message = 'BytePlus Seedance: Activate dreamina-seedance-2-5-260628 in the Ark Console, then refresh Connections.'
    expect(compactProviderError(message, 'byteplus')).toBe(message)
  })

  it('separates the BFL model vendor from the actual fal execution provider', () => {
    const identity = generationExecutionIdentity({ kind: 'element', imageProvider: 'fal', imageModelId: 'fal-ai/flux/schnell' })
    expect(identity).toEqual({ executionProvider: 'fal', modelVendor: 'black-forest-labs' })
    expect(compactProviderError('DNS lookup for the provider failed.', identity.executionProvider)).toBe('fal.ai: DNS lookup failed. Your prompt and settings are preserved; check the internet connection, VPN, proxy, or DNS, then press Rerun.')
  })

  it('names a true direct-provider route from execution identity rather than the model vendor', () => {
    const identity = generationExecutionIdentity({ kind: 'character', imageProvider: 'openai', imageModelId: 'gpt-image-2' })
    expect(identity).toEqual({ executionProvider: 'openai', modelVendor: 'openai' })
    expect(compactProviderError('Request failed.', identity.executionProvider)).toBe('OpenAI: Request failed.')
  })

  it('uses canonical generation routing for non-prompt errors and preserves prompt assistant routing', () => {
    expect(source).toContain("const errorProvider: ServiceProvider = data.kind === 'prompt' ? enhanceProvider : generationServiceProvider(data)")
    expect(source).toContain('const displayError = compactProviderError(useNodeErrorNotice(data), errorProvider)')
  })
})
