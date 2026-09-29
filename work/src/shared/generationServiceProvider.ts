import type { NodeKind, ServiceProvider, StudioNodeData } from './types'
import { resolveVideoModel } from './videoModels'

type GenerationProviderData = Pick<StudioNodeData, 'kind' | 'videoEngine' | 'imageProvider' | 'imageModelId' | 'voiceEngine'> & { kind: NodeKind }

export function generationServiceProvider(data: GenerationProviderData): ServiceProvider {
  if (data.kind === 'voiceover' && data.voiceEngine === 'fish-audio') return 'fish'
  if (['image-generator', 'image-editor', 'character', 'element', 'location', 'wardrobe'].includes(data.kind)) return data.imageProvider || 'fal'
  if (data.kind === 'video-generator') return resolveVideoModel(data.videoEngine).provider
  return 'fal'
}

export function generationExecutionIdentity(data: GenerationProviderData): { executionProvider: ServiceProvider; modelVendor: string } {
  const executionProvider = generationServiceProvider(data)
  const modelId = data.imageModelId || data.videoEngine || ''
  const modelVendor = /flux|black[- ]forest/i.test(modelId) ? 'black-forest-labs'
    : /gpt|openai/i.test(modelId) ? 'openai'
      : /gemini|imagen|nano-banana|veo/i.test(modelId) ? 'google'
        : /seedance|bytedance/i.test(modelId) ? 'bytedance'
          : /kling|kuaishou/i.test(modelId) ? 'kuaishou'
            : executionProvider
  return { executionProvider, modelVendor }
}
