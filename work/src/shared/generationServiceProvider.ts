import type { NodeKind, ServiceProvider, StudioNodeData } from './types'
import { resolveVideoModel } from './videoModels'

type GenerationProviderData = Pick<StudioNodeData, 'kind' | 'videoEngine' | 'imageProvider' | 'imageModelId' | 'voiceEngine' | 'audioProvider'> & { kind: NodeKind; falNative?: { endpointId: string }; higgsfieldNative?: { endpointId: string }; falDraftRecovery?: { endpointId: string; requestId: string }; draftCompletion?: { provider: 'fal' | 'byteplus' } }

export function generationServiceProvider(data: GenerationProviderData): ServiceProvider {
  if (data.falDraftRecovery) return 'fal'
  if (data.draftCompletion) return data.draftCompletion.provider
  if (data.higgsfieldNative) return 'higgsfield'
  if (data.falNative) return 'fal'
  if (data.kind === 'voiceover' && data.voiceEngine === 'fish-audio') return 'fish'
  if (data.kind === 'voiceover' && data.voiceEngine === 'elevenlabs-direct' || data.kind === 'sound-effects' && data.audioProvider === 'elevenlabs') return 'elevenlabs'
  if (['image-generator', 'image-editor', 'character', 'element', 'location', 'wardrobe'].includes(data.kind)) return data.imageProvider || 'fal'
  if (data.kind === 'video-generator') return resolveVideoModel(data.videoEngine).provider
  return 'fal'
}

export function generationExecutionIdentity(data: GenerationProviderData): { executionProvider: ServiceProvider; modelVendor: string } {
  const executionProvider = generationServiceProvider(data)
  const modelId = data.higgsfieldNative?.endpointId || data.falNative?.endpointId || data.imageModelId || data.videoEngine || ''
  const modelVendor = data.kind === 'voiceover' && data.voiceEngine !== 'fish-audio' || data.kind === 'sound-effects' ? 'elevenlabs'
    : /flux|black[- ]forest/i.test(modelId) ? 'black-forest-labs'
    : /gpt|openai/i.test(modelId) ? 'openai'
      : /gemini|imagen|nano-banana|veo/i.test(modelId) ? 'google'
        : /seedance|bytedance/i.test(modelId) ? 'bytedance'
          : /kling|kuaishou/i.test(modelId) ? 'kuaishou'
            : executionProvider
  return { executionProvider, modelVendor }
}
