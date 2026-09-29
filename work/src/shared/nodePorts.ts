import type { ConnectionSignal } from './nodeConnections'
import type { StudioNodeData } from './types'
import { resolveVideoModel } from './videoModels'
import { imageReferenceConnectionLimit } from './imageModels'

export interface NodeInputPortContract {
  id: string
  signal: ConnectionSignal
  label: string
  top: number
  icon?: 'start-frame' | 'end-frame' | 'single-mixed' | 'prompt' | 'image-reference' | 'semantic-reference' | 'character-reference' | 'wardrobe-reference' | 'element-reference' | 'location-reference' | 'source-video' | 'reference-video' | 'reference-audio' | 'media-collection'
  /** Omit for collection/reference ports that intentionally accept many edges. */
  maxConnections?: number
}

export function nodeInputPorts(data: Pick<StudioNodeData, 'kind' | 'videoEngine' | 'upscalerModel' | 'imageProvider' | 'imageModelId'>): NodeInputPortContract[] {
  const text = (): NodeInputPortContract => ({ id: 'text-in', signal: 'text', label: 'Text or Prompt', top: 54, icon: 'prompt' })
  const storyboard = (): NodeInputPortContract => ({ id: 'storyboard-in', signal: 'storyboard', label: 'Storyboard (Optional)', top: 94, maxConnections: 1 })
  const image = (label = 'Image Reference', top = 94, icon?: NodeInputPortContract['icon'], maxConnections = 1): NodeInputPortContract => ({ id: 'image-in', signal: 'image', label, top, icon, maxConnections })
  const style = (top = 134): NodeInputPortContract => ({ id: 'style-in', signal: 'style', label: 'Style Reference', top, maxConnections: 1 })
  const reference = (top = 134): NodeInputPortContract => ({ id: 'reference-in', signal: 'image', label: 'Character, Wardrobe, Element, or Location Reference', top, icon: 'semantic-reference' })
  switch (data.kind) {
    case 'image-generator': return [text(), image('Image Reference', 94, 'image-reference', imageReferenceConnectionLimit(data)), reference(), style(174)]
    case 'image-editor': return [text(), image('Source Image', 94, 'image-reference', imageReferenceConnectionLimit(data)), reference(), style(174)]
    case 'upscaler': return data.upscalerModel === 'realesrgan-video'
      ? [{ id: 'video-in', signal: 'video', label: 'Video to Upscale', top: 54, icon: 'source-video', maxConnections: 1 }]
      : [image('Image to Upscale', 54)]
    case 'character': return [{ ...style(86), label: 'Creation Style (Optional)' }, { id: 'wardrobe-in', signal: 'image', label: 'Wardrobe Reference', top: 126, icon: 'wardrobe-reference', maxConnections: 1 }]
    case 'location': return [{ ...style(86), label: 'Creation Style (Optional)' }]
    case 'wardrobe': return [{ ...style(86), label: 'Creation Style (Optional)' }]
    case 'element': return [{ ...style(86), label: 'Creation Style (Optional)' }]
    case 'style-reference': return []
    case 'storyboard': return [
      { ...style(86), label: 'Style Reference' },
      { id: 'character-in', signal: 'image', label: 'Character Reference', top: 126, icon: 'character-reference' },
      { id: 'element-in', signal: 'image', label: 'Element Reference', top: 166, icon: 'element-reference' },
      { id: 'location-in', signal: 'image', label: 'Location Reference', top: 206, icon: 'location-reference' },
      { id: 'reference-in', signal: 'image', label: 'Image Reference', top: 246, icon: 'image-reference' },
    ]
    case 'storyboard-asset': return [{ id: 'storyboard-in', signal: 'storyboard', label: 'Storyboard', top: 54, maxConnections: 1 }]
    case 'list': return [{ id: 'input', signal: 'mixed', label: 'Generated or Imported Media Batch', top: 86, icon: 'media-collection' }]
    case 'voiceover':
    case 'sound-effects':
    case 'music-generator': return []
    case 'gallery': return [{ id: 'media-in', signal: 'mixed', label: 'Media Collection', top: 86, icon: 'media-collection' }]
    case 'output': return []
    case 'router': return [{ id: 'input', signal: 'mixed', label: 'Any Supported Input', top: 54, icon: 'single-mixed', maxConnections: 1 }]
    case 'video-generator': {
      const model = resolveVideoModel(data.videoEngine)
      const mode = model.mode
      const characterReference = (top: number): NodeInputPortContract => ({ id: 'character-in', signal: 'image', label: 'Character Reference', top, icon: 'character-reference' })

      const elementReference = (top: number): NodeInputPortContract => ({ id: 'element-in', signal: 'image', label: 'Element Reference', top, icon: 'element-reference' })
      const locationReference = (top: number): NodeInputPortContract => ({ id: 'location-in', signal: 'image', label: 'Location Reference', top, icon: 'location-reference' })
      const semanticInputs = (): NodeInputPortContract[] => [text(), storyboard(), characterReference(134), elementReference(174), locationReference(214), style(254)]
      const imageReference = (top: number): NodeInputPortContract => ({ id: 'reference-in', signal: 'image', label: 'Image Reference', top, icon: 'image-reference' })
      const videoReference = (top: number): NodeInputPortContract => ({ id: 'video-reference-in', signal: 'video', label: 'Video Reference', top, icon: 'reference-video', maxConnections: model.referenceLimits?.videos || 3 })
      const audioReference = (top: number): NodeInputPortContract => ({ id: 'audio-reference-in', signal: 'audio', label: 'Audio Reference', top, icon: 'reference-audio', maxConnections: model.referenceLimits?.audios || 3 })
      const endImage = (label: string, top: number): NodeInputPortContract => ({ id: 'end-image', signal: 'image', label, top, icon: 'end-frame', maxConnections: 1 })
      if (mode === 'text') return semanticInputs()
      if (mode === 'extend') return [...semanticInputs(), { id: 'video-in', signal: 'video', label: 'Video to Extend', top: 294, icon: 'source-video', maxConnections: 1 }]
      if (mode === 'first-last') return [...semanticInputs(), image('Starting Image', 294, 'start-frame'), endImage('Ending Image', 334), imageReference(374)]
      if (mode === 'reference' && model.family === 'kling') return [...semanticInputs(), image('Starting Image (Optional)', 294, 'start-frame'), endImage('Ending Image (Optional)', 334), imageReference(374), videoReference(414)]
      if (mode === 'reference' && model.family === 'seedance') return [...semanticInputs(), image('Starting Image (Optional)', 294, 'start-frame'), imageReference(334), videoReference(374), audioReference(414)]
      if (mode === 'reference') return [...semanticInputs(), imageReference(294)]
      if (mode === 'image' && ['seedance', 'kling'].includes(model.family)) return [...semanticInputs(), image('Starting Image', 294, 'start-frame'), endImage('Ending Image (Optional)', 334), imageReference(374)]
      return [...semanticInputs(), image('Starting Image', 294, 'start-frame'), imageReference(334)]
    }
    default: return []
  }
}
