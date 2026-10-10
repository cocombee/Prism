import type { NodeKind, StudioNodeData } from './types'
import { nodeInputPorts } from './nodePorts'

export type ConnectionSignal = 'text' | 'image' | 'video' | 'audio' | 'style' | 'storyboard' | 'mixed'
export type SourceConnectionData = Pick<StudioNodeData, 'kind' | 'outputType' | 'listSignal' | 'routeSignal' | 'upscalerModel'>

// This is only the palette universe, not a compatibility rulebook. Declared
// ports plus connectionCompatibilityError decide which candidates survive.
const QUICK_CONNECT_TARGET_KINDS: NodeKind[] = [
  'image-generator', 'upscaler', 'video-generator', 'list', 'gallery',
  'character', 'wardrobe', 'element', 'location', 'storyboard', 'router',
]

type TargetConnectionData = Pick<StudioNodeData, 'kind' | 'videoEngine' | 'upscalerModel' | 'imageProvider' | 'imageModelId' | 'falNative' | 'higgsfieldNative'>

export function outputSignalFor(data: SourceConnectionData, sourceHandleId?: string | null): ConnectionSignal {
  if (sourceHandleId?.includes('storyboard')) return 'storyboard'
  if (sourceHandleId?.includes('audio')) return 'audio'
  if (sourceHandleId?.includes('video')) return 'video'
  if (sourceHandleId?.includes('text') || sourceHandleId === 'generated_prompt') return 'text'
  if (sourceHandleId?.includes('image')) return 'image'
  if (data.kind === 'prompt' || data.kind === 'assistant') return 'text'
  if (data.kind === 'style-reference') return 'style'
  if (['storyboard', 'storyboard-asset'].includes(data.kind)) return 'storyboard'
  if (data.kind === 'video-generator' || data.outputType === 'video') return 'video'
  if (data.kind === 'upscaler' && data.upscalerModel === 'realesrgan-video') return 'video'
  if (['voiceover', 'sound-effects', 'music-generator'].includes(data.kind) || data.outputType === 'audio') return 'audio'
  if (data.kind === 'list') return data.listSignal || 'mixed'
  if (data.kind === 'router') return data.routeSignal || 'mixed'
  if ((data.kind === 'upload' || data.kind === 'output') && !data.outputType) return 'mixed'
  return 'image'
}

export function compatibleNodeTargets(data: SourceConnectionData, sourceHandleId?: string | null): NodeKind[] {
  if (['frame', 'sticky-note', 'comment', 'sticker', 'drawing', 'gallery'].includes(data.kind)) return []
  const sourceHandle = sourceHandleId || compatibleSourceHandle(data.kind, outputSignalFor(data, sourceHandleId))
  return QUICK_CONNECT_TARGET_KINDS.filter((kind) => {
    const target = targetConnectionDataForSource(data, kind, sourceHandleId)
    return nodeInputPorts(target).some((port) => !connectionCompatibilityError(data, target, sourceHandle, port.id))
  })
}

export function recommendedVideoEngineForSource(data: SourceConnectionData, sourceHandleId?: string | null): string | undefined {
  const signal = outputSignalFor(data, sourceHandleId)
  if (['character', 'location', 'element', 'style-reference'].includes(data.kind)) return 'fal-ai/kling-video/o3/standard/reference-to-video'
  if (data.kind === 'list' && ['image', 'video', 'audio'].includes(signal)) return 'bytedance/seedance-2.0/reference-to-video'
  if (signal === 'audio') return 'bytedance/seedance-2.0/reference-to-video'
  if (signal === 'image') return 'bytedance/seedance-2.0/image-to-video'
  if (signal === 'video') return 'fal-ai/veo3.1/extend-video'
  return undefined
}

export function compatibleTargetHandle(source: SourceConnectionData, targetKindOrData: NodeKind | TargetConnectionData, sourceHandleId?: string | null): string {
  const target = typeof targetKindOrData === 'string' ? targetConnectionDataForSource(source, targetKindOrData, sourceHandleId) : targetKindOrData
  const targetKind = target.kind
  const sourceHandle = sourceHandleId || compatibleSourceHandle(source.kind, outputSignalFor(source, sourceHandleId))
  const accepted = nodeInputPorts(target).filter((port) => !connectionCompatibilityError(source, target, sourceHandle, port.id))
  if (!accepted.length) return ''
  const signal = outputSignalFor(source, sourceHandleId)
  const preferred = signal === 'style' ? ['style-in', 'reference-in']
    : signal === 'storyboard' ? ['storyboard-in']
      : source.kind === 'wardrobe' ? ['wardrobe-in']
        : ['character', 'location', 'element'].includes(source.kind) ? [`${source.kind}-in`, 'reference-in', 'media-in']
        : source.kind === 'list' && signal === 'image' ? ['reference-in', 'image-in', 'media-in']
          : targetKind === 'video-generator' && signal === 'image' ? ['reference-in', 'image-in', 'media-in', 'input']
          : signal === 'video' ? ['video-reference-in', 'video-in', 'media-in', 'input']
            : signal === 'audio' ? ['audio-reference-in', 'audio-in', 'media-in', 'input']
              : signal === 'text' ? ['text-in', 'input']
                : ['image-in', 'reference-in', 'media-in', 'input']
  return preferred.map((id) => accepted.find((port) => port.id === id)?.id).find(Boolean) || accepted[0].id
}

export function recoveredConnectionTargetHandle(
  source: SourceConnectionData,
  target: TargetConnectionData,
  sourceHandleId?: string | null,
  reportedTargetHandle?: string | null,
): string {
  if (reportedTargetHandle) return reportedTargetHandle
  if (target.kind !== 'character' || !['style-reference', 'wardrobe'].includes(source.kind)) return ''
  return compatibleTargetHandle(source, target, sourceHandleId)
}

function targetConnectionDataForSource(source: SourceConnectionData, kind: NodeKind, sourceHandleId?: string | null): TargetConnectionData {
  return {
    kind,
    videoEngine: kind === 'video-generator' ? recommendedVideoEngineForSource(source, sourceHandleId) : undefined,
  }
}

export function compatibleSourceHandle(kind: NodeKind, signal: ConnectionSignal): string {
  if (kind === 'prompt') return 'text-out'
  if (kind === 'assistant') return 'generated_prompt'
  if (kind === 'router') return 'output'
  if (kind === 'storyboard' || kind === 'storyboard-asset') return 'storyboard-out'
  if (kind === 'list') return 'mixed-out'
  return 'media-out'
}

export function targetSignalFor(data: TargetConnectionData, targetHandle?: string | null): ConnectionSignal | null {
  if (!targetHandle) return null
  const native = data.falNative?.media.find(binding => binding.portId === targetHandle)
  if (native) return native.type
  if (data.higgsfieldNative) {
    const port = nodeInputPorts(data).find(port => port.id === targetHandle)
    if (port) return port.signal
  }
  if (targetHandle === 'text-in' || targetHandle === 'prompt') return 'text'
  if (targetHandle === 'image-in' || targetHandle === 'end-image' || targetHandle === 'reference-in' || targetHandle === 'reference' || ['character-in', 'wardrobe-in', 'element-in', 'location-in'].includes(targetHandle)) return 'image'
  if (targetHandle === 'video-in' || targetHandle === 'video-reference-in') return 'video'
  if (targetHandle === 'audio-in' || targetHandle === 'audio-reference-in') return 'audio'
  if (targetHandle === 'style-in') return 'style'
  if (targetHandle === 'storyboard-in') return 'storyboard'
  if (targetHandle === 'media-in' || targetHandle === 'input') return 'mixed'
  return null
}

const ADDABLE_SOURCE_KINDS: NodeKind[] = [
  'prompt', 'upload', 'character', 'wardrobe', 'location', 'element', 'style-reference', 'list', 'storyboard', 'storyboard-asset',
  'voiceover', 'sound-effects', 'router', 'image-generator', 'upscaler', 'video-generator',
]

export function sourceConnectionDataForInput(kind: NodeKind, target: TargetConnectionData, targetHandle: string): SourceConnectionData {
  const targetSignal = targetSignalFor(target, targetHandle) || 'mixed'
  const mediaSignal = ['image', 'video', 'audio'].includes(targetSignal) ? targetSignal as 'image' | 'video' | 'audio' : undefined
  return {
    kind,
    outputType: kind === 'upload' ? mediaSignal : undefined,
    listSignal: kind === 'list' ? targetSignal : undefined,
    routeSignal: kind === 'router' ? targetSignal : undefined,
  }
}

export function compatibleNodeSources(target: TargetConnectionData, targetHandle: string): NodeKind[] {
  if (target.kind === 'video-generator' && targetHandle === 'storyboard-in') return ['storyboard']
  return ADDABLE_SOURCE_KINDS.filter((kind) => {
    const source = sourceConnectionDataForInput(kind, target, targetHandle)
    const sourceHandle = compatibleSourceHandle(kind, outputSignalFor(source))
    return !connectionCompatibilityError(source, target, sourceHandle, targetHandle)
  })
}

export function connectionCompatibilityError(
  source: SourceConnectionData,
  target: TargetConnectionData,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): string | null {
  const sourceSignal = outputSignalFor(source, sourceHandle)
  const targetSignal = targetSignalFor(target, targetHandle)
  const handle = targetHandle || ''
  const native = target.falNative?.media.find(binding => binding.portId === handle)
  const higgsfieldMedia = target.higgsfieldNative?.media?.find(binding => binding.portId === handle)
  if (target.falNative?.retiredPorts?.some(port => port.id === handle) && !native && nodeInputPorts(target).find(port => port.id === handle)?.maxConnections === 0) return 'This model no longer declares that input. Disconnect or rebind its preserved connection.'
  if (target.higgsfieldNative?.retiredPorts?.some(port => port.id === handle) && nodeInputPorts(target).find(port => port.id === handle)?.maxConnections === 0) return 'This model no longer declares that input. Disconnect or rebind its preserved connection.'
  if (native?.retired) return 'This model no longer declares that input. Disconnect or rebind its preserved connection.'
  if (higgsfieldMedia?.retired) return 'This model no longer declares that input. Disconnect or rebind its preserved connection.'
  if (target.kind === 'output') return 'Generated Output is a legacy materialized result and does not accept upstream connections. Connect media to Gallery instead.'
  if (['storyboard', 'storyboard-asset'].includes(source.kind) && handle !== 'storyboard-in') return 'A Storyboard retains panel timing, camera guidance, and model targeting, so it can connect only to its dedicated Storyboard input.'
  if (source.kind === 'list' && sourceSignal === 'mixed' && target.kind === 'gallery') return 'A mixed List may include text or storyboard data. Connect a homogeneous Image, Video, or Audio List to Gallery instead.'
  if (target.kind === 'gallery' && handle === 'media-in' && !['image', 'video', 'audio'].includes(sourceSignal)) return 'Gallery is a media-only terminal. Connect a materialized Image, Video, or Audio output.'
  if (['voiceover', 'sound-effects', 'music-generator'].includes(target.kind) && !native) return `${target.kind === 'voiceover' ? 'Voiceover' : target.kind === 'sound-effects' ? 'Sound Effects' : 'Music Generator'} is self-contained and does not expose an upstream input. Enter its prompt inside the node.`
  if (target.kind === 'character' && !['style-in', 'wardrobe-in', 'element-in'].includes(handle)) return 'Character accepts optional Style, Wardrobe, and Prop inputs. Create its prompt, Face, and remaining views inside the Character node.'
  if (target.kind === 'style-reference') return 'Style is an output-only visual-language asset. Build its prompt and add its optional reference inside the Style node.'
  if (target.kind === 'location' && !['style-in', 'character-in', 'element-in'].includes(handle)) return 'Location accepts optional Style, Character, and Prop inputs. Create its prompt, references, and generation inside the Location node.'
  if (target.kind === 'wardrobe' && handle !== 'style-in') return 'Wardrobe accepts only an optional Style input. Create its prompt, references, and generation inside the Wardrobe node.'
  if (target.kind === 'element' && handle !== 'style-in') return 'Element accepts only an optional Style input. Create its prompt, Front, and remaining views inside the Element node.'
  if (target.kind === 'storyboard' && !['style-in', 'character-in', 'element-in', 'location-in', 'reference-in'].includes(handle)) return 'Storyboard accepts Style, Character, Element, Location, and ordinary Image Reference inputs. Author panels, timing, and camera inside the Storyboard node.'
  if (source.kind === 'storyboard-asset' && (target.kind !== 'video-generator' || handle !== 'storyboard-in')) return 'A legacy Storyboard deploys only to a Video Generator Storyboard input.'
  if (source.kind === 'list' && !['image', 'video', 'audio'].includes(sourceSignal)) return 'A List is a generated-media batch and must resolve to one homogeneous Image, Video, or Audio type before it can connect downstream.'
  if (source.kind === 'list' && target.kind === 'upscaler') return 'Connect one concrete Image or Video output to Upscaler rather than a generated-media List.'
  const listItemInput = target.kind === 'list' && handle === 'input'
  if (listItemInput && !['image', 'video', 'audio'].includes(sourceSignal)) return 'List is a generated-media batch. Connect an Image, Video, or Audio output—not Prompt, Style, Storyboard, or semantic assets.'
  const semanticImageFallback = ['image-generator', 'image-editor', 'list'].includes(target.kind) && handle === 'image-in'
  const locationFrameFallback = source.kind === 'location' && target.kind === 'video-generator' && (['image-in', 'end-image'].includes(handle) || Boolean(higgsfieldMedia && ['start-frame','end-frame'].includes(higgsfieldMedia.role)))
  if (source.kind === 'wardrobe' && (target.kind !== 'character' || handle !== 'wardrobe-in')) return 'A Wardrobe asset can connect only to a Character Wardrobe input.'
  const semanticRoleHandle = ['character-in', 'wardrobe-in', 'element-in', 'location-in'].includes(handle)
  if (semanticRoleHandle && handle !== `${source.kind}-in`) return `The ${handle.replace('-in', '')} input accepts only a matching reusable ${handle.replace('-in', '')} asset.`
  const legacySemanticHandle = handle === `${source.kind}-in`
  if (['character', 'location', 'element'].includes(source.kind) && !listItemInput && !['reference-in', 'media-in'].includes(handle) && !semanticImageFallback && !locationFrameFallback && !legacySemanticHandle && !(native?.type === 'image' && native.role === 'native-input') && higgsfieldMedia?.role !== 'reference-image') return `A ${source.kind === 'character' ? 'Character' : source.kind === 'location' ? 'Location' : 'Element'} asset can connect only as a semantic Reference, not as Prompt, Start Frame, End Frame, Video, or Audio.`
  if (source.kind === 'style-reference' && !listItemInput && !['style-in', 'reference-in'].includes(handle) && !(target.kind === 'router' && handle === 'input')) return 'A Style asset can connect only to a Style, compatible Reference, or typed Router input.'
  if (source.kind === 'list' && sourceSignal === 'mixed' && target.kind === 'gallery') return 'A mixed List may include text or storyboard data. Connect a homogeneous Image, Video, or Audio List to Gallery instead.'
  if (sourceSignal === 'audio' && !listItemInput && !['audio-in', 'audio-reference-in', 'media-in'].includes(handle) && !(target.kind === 'router' && handle === 'input') && native?.type !== 'audio' && higgsfieldMedia?.type !== 'audio') return 'Audio can connect only to an Audio or compatible media-collection input.'
  if (sourceSignal === 'video' && !listItemInput && !['video-in', 'video-reference-in', 'media-in'].includes(handle) && !(target.kind === 'router' && handle === 'input') && native?.type !== 'video' && higgsfieldMedia?.type !== 'video') return 'Video can connect only to a Video or compatible media-collection input.'
  if (!nodeInputPorts(target).some((port) => port.id === handle)) return 'This node does not declare that input socket.'
  if (!targetSignal) return 'These node types cannot be connected.'
  const compatible = targetSignal === 'mixed'
    ? (target.kind === 'list' && handle === 'input' ? ['image', 'video', 'audio'].includes(sourceSignal) : ['text', 'image', 'video', 'audio', 'style', 'storyboard', 'mixed'].includes(sourceSignal))
    : targetSignal === 'image'
      ? sourceSignal === 'image' || (sourceSignal === 'style' && targetHandle === 'reference-in')
      : targetSignal === 'text'
        ? sourceSignal === 'text' || sourceSignal === 'storyboard' || (sourceSignal === 'mixed' && ['list', 'router'].includes(source.kind))
        : sourceSignal === targetSignal
  if (compatible) return null
  if (targetSignal === 'image') return 'Please insert image-related assets only. Audio and video cannot be used as a Start Frame, End Frame, or Image Reference.'
  if (targetSignal === 'video') return 'Please insert video assets only. Images and audio cannot be used in a Video input.'
  if (targetSignal === 'audio') return 'Please insert audio assets only. Images and video cannot be used in an Audio input.'
  if (targetSignal === 'style') return 'Please insert a Style asset only.'
  if (targetSignal === 'storyboard') return 'Please insert a Storyboard output only.'
  return `A ${sourceSignal} output cannot connect to this ${targetSignal} input.`
}

export function nodeConnectionError(
  sourceNodeId: string,
  targetNodeId: string,
  source: SourceConnectionData,
  target: TargetConnectionData,
  sourceHandle?: string | null,
  targetHandle?: string | null,
): string | null {
  if (sourceNodeId === targetNodeId) return 'A node cannot connect its output back into its own input.'
  return connectionCompatibilityError(source, target, sourceHandle, targetHandle)
}

export function outputCardinalityError(
  edges: Array<Pick<{ source: string; target: string; targetHandle?: string | null }, 'source' | 'target' | 'targetHandle'>>,
  sourceNodeId: string,
  source: SourceConnectionData & { title?: string },
  target: TargetConnectionData,
  targetHandle?: string | null,
  addingConnection = false,
): string | null {
  if (!['storyboard', 'storyboard-asset'].includes(source.kind) || target.kind !== 'video-generator' || targetHandle !== 'storyboard-in') return null
  const count = edges.filter((edge) => edge.source === sourceNodeId && edge.targetHandle === 'storyboard-in').length
  if (count + (addingConnection ? 1 : 0) <= 1) return null
  return `${source.title || 'Storyboard'} accepts one direct Video Generator target. Disconnect the existing one before connecting another.`
}

export function inputCardinalityError(
  edges: Array<Pick<{ source: string; target: string; targetHandle?: string | null }, 'source' | 'target' | 'targetHandle'>>,
  targetNodeId: string,
  target: TargetConnectionData & { title?: string },
  targetHandle?: string | null,
  addingConnection = false,
): string | null {
  const port = nodeInputPorts(target).find((candidate) => candidate.id === targetHandle)
  if (!port?.maxConnections) return null
  const count = edges.filter((edge) => edge.target === targetNodeId && edge.targetHandle === targetHandle).length
  if (count + (addingConnection ? 1 : 0) <= port.maxConnections) return null
  const nodeName = target.title || (target.kind === 'video-generator' ? 'Video Generator' : target.kind === 'image-generator' ? 'Image Generator' : target.kind === 'image-editor' ? 'Image Editor' : target.kind === 'style-reference' ? 'Style' : target.kind.charAt(0).toUpperCase() + target.kind.slice(1).replace(/-/g, ' '))
  const portName = `${port.label.replace(/\s*\(Optional\)$/i, '')}${port.signal === 'storyboard' ? ' plan' : ''}`
  return port.maxConnections === 1
    ? `${nodeName} accepts one ${portName}. Disconnect the existing one before connecting another.`
    : `${nodeName} accepts up to ${port.maxConnections} ${portName} connections. Disconnect one before connecting another.`
}

export function pruneSurplusInputEdges<T extends { source: string; target: string; targetHandle?: string | null }>(
  edges: T[],
  targets: Array<{ id: string; data: TargetConnectionData & { title?: string } }>,
): { edges: T[]; removed: Array<{ edge: T; message: string }> } {
  const byId = new Map(targets.map((target) => [target.id, target.data]))
  const counts = new Map<string, number>()
  const storyboardSources = new Set<string>()
  const kept: T[] = []
  const removed: Array<{ edge: T; message: string }> = []
  for (const edge of edges) {
    const source = byId.get(edge.source)
    const target = byId.get(edge.target)
    if (source && target && ['storyboard', 'storyboard-asset'].includes(source.kind) && target.kind === 'video-generator' && edge.targetHandle === 'storyboard-in') {
      if (storyboardSources.has(edge.source)) {
        removed.push({ edge, message: outputCardinalityError(kept, edge.source, source, target, edge.targetHandle, true)! })
        continue
      }
      storyboardSources.add(edge.source)
    }
    // Native model changes retain every saved edge; readiness validates capacity and retired sockets.
    if (target?.falNative || target?.higgsfieldNative) { kept.push(edge); continue }
    const port = target && nodeInputPorts(target).find((candidate) => candidate.id === edge.targetHandle)
    if (!target || !port?.maxConnections) {
      kept.push(edge)
      continue
    }
    const key = `${edge.target}|${edge.targetHandle}`
    const count = counts.get(key) || 0
    if (count < port.maxConnections) {
      counts.set(key, count + 1)
      kept.push(edge)
      continue
    }
    removed.push({ edge, message: inputCardinalityError(kept, edge.target, target, edge.targetHandle, true)! })
  }
  return { edges: kept, removed }
}

type DynamicInputEdge = { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }

export function reconcileDynamicInputEdges<T extends DynamicInputEdge>(
  edges: T[],
  targetId: string,
  target: TargetConnectionData & { title?: string },
  sources: Record<string, SourceConnectionData & { title?: string }>,
): { edges: T[]; removed: Array<{ edge: T; message: string }> } {
  const ports = nodeInputPorts(target)
  const portIds = new Set(ports.map((port) => port.id))
  const kept: T[] = []
  const removed: Array<{ edge: T; message: string }> = []
  const ordinaryReferenceHandles = new Set(['reference-in', 'reference', 'image-reference-in'])

  for (const edge of edges) {
    if (edge.target !== targetId) {
      kept.push(edge)
      continue
    }
    const source = sources[edge.source]
    const currentHandle = edge.targetHandle || ''
    if (source && portIds.has(currentHandle) && !connectionCompatibilityError(source, target, edge.sourceHandle, currentHandle)) {
      kept.push(edge)
      continue
    }

    let candidates: string[] = []
    if (source?.kind === 'wardrobe') candidates = ['wardrobe-in']
    else if (source && ['character', 'element', 'location'].includes(source.kind)) candidates = [`${source.kind}-in`, 'reference-in']
    else if (source?.kind === 'style-reference') candidates = ['style-in', 'reference-in']
    else if (source && ['storyboard', 'storyboard-asset'].includes(source.kind)) candidates = ['storyboard-in']
    else if (source && ordinaryReferenceHandles.has(currentHandle)) {
      candidates = ports
        .filter((port) => port.id === 'reference-in' || (port.icon === 'image-reference' && /reference/i.test(port.label) && !/starting|source/i.test(port.label)))
        .map((port) => port.id)
    }

    const replacement = source && candidates.find((candidate) => portIds.has(candidate) && !connectionCompatibilityError(source, target, edge.sourceHandle, candidate))
    if (replacement) {
      kept.push({ ...edge, targetHandle: replacement })
      continue
    }

    const sourceName = source?.title || source?.kind?.replace(/-/g, ' ') || 'An incoming connection'
    const targetName = target.title || (target.kind === 'video-generator' ? 'Video Generator' : target.kind === 'image-generator' ? 'Image Generator' : target.kind === 'image-editor' ? 'Image Editor' : 'the selected model')
    removed.push({ edge, message: `${sourceName} was disconnected from ${targetName} because the selected model has no compatible input for its existing role.` })
  }

  const cardinality = pruneSurplusInputEdges(kept, [{ id: targetId, data: target }])
  return {
    edges: cardinality.edges,
    removed: [
      ...removed,
      ...cardinality.removed.map(({ edge, message }) => ({ edge, message: `${message} The surplus connection was disconnected after the model change.` })),
    ],
  }
}
