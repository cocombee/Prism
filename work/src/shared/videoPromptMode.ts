import type { Edge } from '@xyflow/react'
import type { StudioNode, StudioNodeData } from './types'
import { nodeInputPorts } from './nodePorts'

export type VideoPromptMode = 'auto' | 'manual'

export function videoPromptInputsConnected(node: StudioNode, nodes: StudioNode[], edges: Edge[]): boolean {
  const sourceIds = new Set(nodes.map(source => source.id))
  const declaredInputs = new Set(nodeInputPorts(node.data).map(port => port.id))
  return edges.some(edge => edge.target === node.id && sourceIds.has(edge.source)
    && Boolean(edge.targetHandle && declaredInputs.has(edge.targetHandle)))
}

export function nextVideoPromptRovingMode(current: VideoPromptMode, key: string): VideoPromptMode {
  if (key === 'Home' || key === 'ArrowLeft') return 'auto'
  if (key === 'End' || key === 'ArrowRight') return 'manual'
  return current
}

export function videoPromptRovingTabIndex(mode: VideoPromptMode, rovingMode: VideoPromptMode): 0 | -1 {
  return mode === rovingMode ? 0 : -1
}

export function activeVideoPromptMode(data: StudioNodeData, storyboardConnected: boolean): VideoPromptMode {
  if (data.promptMode === 'auto') return 'auto'
  if (!storyboardConnected) return 'manual'
  return data.promptMode === 'manual' ? 'manual' : 'auto'
}

export function migrateVideoUserSeed(node: StudioNode, _lockedPrompt: string): Partial<StudioNodeData> {
  return {
    manualPromptDraft: node.data.manualPromptDraft,
    manualPromptSeeded: node.data.manualPromptSeeded,
    manualPromptSeedVersion: node.data.manualPromptSeedVersion === 1 ? 2 : node.data.manualPromptSeedVersion,
  }
}

export function switchVideoPromptMode(node: StudioNode, mode: VideoPromptMode, autoPrompt?: string): Partial<StudioNodeData> {
  const migrated = migrateVideoUserSeed(node, autoPrompt || '')
  if (mode === 'manual' && migrated.manualPromptDraft !== node.data.manualPromptDraft) return { promptMode: 'manual', ...migrated }
  if (mode === 'manual' && !node.data.manualPromptSeeded) return {
    promptMode: 'manual',
    manualPromptDraft: autoPrompt || (node.data.manualPromptDraft ?? node.data.prompt ?? ''),
    manualPromptSeeded: true,
    manualPromptSeedVersion: 2,
  }
  return { promptMode: mode, manualPromptDraft: node.data.manualPromptDraft, manualPromptSeeded: node.data.manualPromptSeeded }
}

export function resetManualPrompt(node: StudioNode, autoPrompt: string): Partial<StudioNodeData> {
  return { promptMode: 'manual', manualPromptDraft: autoPrompt, manualPromptSeeded: true, manualPromptSeedVersion: 2 }
}

function compilerData(data: StudioNodeData): unknown {
  if (data.kind === 'storyboard') return {
    kind: data.kind, title: data.title, referenceTag: data.referenceTag,
    storyboardMode: data.storyboardMode, storyboardDuration: data.storyboardDuration,
    storyboardModelId: data.storyboardModelId,
    storyboardPanels: data.storyboardPanels?.map((panel) => ({ id: panel.id, prompt: panel.prompt, duration: panel.duration, shotSize: panel.shotSize, camera: panel.camera, audioCue: panel.audioCue, locked: panel.locked, transitionToNext: panel.transitionToNext })),
  }
  if (['character', 'wardrobe', 'element', 'location', 'style-reference', 'upload', 'prompt'].includes(data.kind)) return {
    kind: data.kind, title: data.title, referenceTag: data.referenceTag, prompt: data.prompt,
    referenceDescription: data.referenceDescription, referenceDescriptionMode: data.referenceDescriptionMode,
    stylePrompt: data.stylePrompt, styleDescription: data.styleDescription,
    referenceAssets: data.referenceAssets?.map((asset) => ({ id: asset.id, name: asset.name, path: asset.path, url: asset.url, mimeType: asset.mimeType, metadata: asset.metadata })),
    generatedResults: data.generatedResults?.map((result) => ({ path: result.path, url: result.url, type: result.type, modelId: result.modelId, createdAt: result.createdAt })),
    activeResultIndex: data.activeResultIndex,
    outputPath: data.outputPath, outputUrl: data.outputUrl, outputType: data.outputType, assetPath: data.assetPath, assetUrl: data.assetUrl,
  }
  return { kind: data.kind, title: data.title, videoEngine: data.videoEngine, aspectRatio: data.aspectRatio, duration: data.duration, frameRate: data.frameRate, motionCadence: data.motionCadence, motionCadenceMode: data.motionCadenceMode, shutterMode: data.shutterMode, shutterAngle: data.shutterAngle }
}

export function videoPromptCompileFingerprint(target: StudioNode, nodes: StudioNode[], edges: Edge[]): string {
  const relevantIds = new Set<string>([target.id])
  const relevantEdges: Edge[] = []
  const queue = [target.id]
  while (queue.length) {
    const targetId = queue.shift()!
    for (const edge of edges.filter((candidate) => candidate.target === targetId)) {
      relevantEdges.push(edge)
      if (!relevantIds.has(edge.source)) {
        relevantIds.add(edge.source)
        queue.push(edge.source)
      }
    }
  }
  const normalizedEdges = relevantEdges
    .map((edge) => ({ source: edge.source, sourceHandle: edge.sourceHandle, target: edge.target, targetHandle: edge.targetHandle, inputFidelity: (edge.data as { inputFidelity?: string } | undefined)?.inputFidelity || 'auto' }))
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  const relevantNodes = nodes.filter((node) => relevantIds.has(node.id)).map((node) => ({ id: node.id, data: compilerData(node.data) })).sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify({ target: target.id, nodes: relevantNodes, edges: normalizedEdges })
}
