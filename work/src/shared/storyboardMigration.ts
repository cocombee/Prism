import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { migrateShutterSelection } from './shutter'
import { reconcileStoryboardDurationBudget, STORYBOARD_DURATION_FALLBACK_OPTIONS } from './storyboardDurationBudget'
import { migrateStoryboardPanelDuration } from './storyboardPanels'
import { resolveVideoModel } from './videoModels'

const unifiedStoryboardTitle = (title?: string) => {
  const normalized = title?.trim().replace(/\s+(?:Creator|Asset)$/i, '').trim()
  return normalized || 'Storyboard'
}

type MistakenStoryboardData = StudioNode['data'] & {
  storyboardImageMode?: unknown
  storyboardImageAspectRatio?: unknown
}

function acceptedStoryboardData(data: StudioNode['data']): StudioNode['data'] {
  const {
    storyboardImageMode: _storyboardImageMode,
    storyboardImageAspectRatio: _storyboardImageAspectRatio,
    aspectRatio: _aspectRatio,
    imageResolution: _imageResolution,
    storyboardEditorOpen: _storyboardEditorOpen,
    selectorDeployment: _selectorDeployment,
    ...accepted
  } = data as MistakenStoryboardData
  return accepted as StudioNode['data']
}

function reconciledStoryboardDurationData(data: StudioNode['data'], nodeId: string): StudioNode['data'] {
  const model = resolveVideoModel(data.storyboardModelId)
  const numericDurations = model.durations.filter((value): value is number => typeof value === 'number')
  const modelDurationOptions = numericDurations.length ? numericDurations : [...STORYBOARD_DURATION_FALLBACK_OPTIONS]
  const migratedPanels = (data.storyboardPanels?.length ? data.storyboardPanels : [
    { id: `${nodeId}-panel-1`, prompt: '', duration: 1, shotSize: 'wide' as const, camera: 'static', audioCue: '', locked: false },
    { id: `${nodeId}-panel-2`, prompt: '', duration: 1, shotSize: 'wide' as const, camera: 'static', audioCue: '', locked: false },
  ]).map(migrateStoryboardPanelDuration)
  const budget = reconcileStoryboardDurationBudget({
    panels: migratedPanels,
    mode: data.storyboardMode || 'single',
    targetDuration: data.storyboardDuration || Math.max(...modelDurationOptions),
    modelDurationOptions,
  })
  return { ...data, storyboardPanels: budget.panels, storyboardPanelCount: budget.panels.length, storyboardDuration: budget.targetDuration }
}

export function migrateUnifiedStoryboards(nodes: StudioNode[], edges: Edge[]): { nodes: StudioNode[]; edges: Edge[] } {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const absorbed = new Set<string>()
  const resultToCreator = new Map<string, string>()

  const migratedNodes = nodes.map((node) => {
    if (node.data.kind !== 'storyboard') return node
    const data = acceptedStoryboardData(node.data)
    const resultEdge = edges.find((edge) => edge.source === node.id && byId.get(edge.target)?.data.kind === 'storyboard-asset')
    const result = resultEdge ? byId.get(resultEdge.target) : nodes.find((candidate) => candidate.data.kind === 'storyboard-asset' && candidate.data.storyboardSourceId === node.id)
    if (!result) return { ...node, data: { ...data, title: unifiedStoryboardTitle(data.title) } }
    const resultData = acceptedStoryboardData(result.data)
    const authoredPanels = data.storyboardPanels?.length ? data.storyboardPanels : resultData.storyboardPanels
    const compiledPanels = resultData.storyboardPanels
    const panelsDiverged = Boolean(
      data.storyboardPanels?.length
      && compiledPanels?.length
      && JSON.stringify(data.storyboardPanels) !== JSON.stringify(compiledPanels),
    )
    absorbed.add(result.id)
    resultToCreator.set(result.id, node.id)
    return {
      ...node,
      data: {
        ...data,
        title: unifiedStoryboardTitle(resultData.title || data.title),
        referenceTag: resultData.referenceTag || data.referenceTag,
        outputPath: resultData.outputPath || data.outputPath,
        outputUrl: resultData.outputUrl || data.outputUrl,
        outputType: resultData.outputType || data.outputType,
        storyboardPanels: authoredPanels,
        storyboardDuration: data.storyboardDuration || resultData.storyboardDuration,
        storyboardNeedsCompile: Boolean(data.storyboardNeedsCompile || panelsDiverged),
        storyboardSourceId: undefined,
      },
    }
  })

  for (const node of nodes) {
    if (node.data.kind !== 'storyboard-asset' || absorbed.has(node.id)) continue
    resultToCreator.set(node.id, node.id)
  }

  const unifiedNodes = migratedNodes
    .filter((node) => !absorbed.has(node.id))
    .map((node) => node.data.kind !== 'storyboard-asset' ? node : ({
      ...node,
      type: 'storyboard',
      data: {
        ...acceptedStoryboardData(node.data),
        kind: 'storyboard',
        title: unifiedStoryboardTitle(node.data.title),
        storyboardNeedsCompile: false,
        storyboardSourceId: undefined,
      },
    } as StudioNode))
    .map((node) => node.data.kind === 'storyboard'
      ? { ...node, data: reconciledStoryboardDurationData(node.data, node.id) }
      : node)

  const seen = new Set<string>()
  const unifiedEdges = edges.flatMap((edge) => {
    const source = resultToCreator.get(edge.source) || edge.source
    const target = resultToCreator.get(edge.target) || edge.target
    if (source === target || (byId.get(edge.target)?.data.kind === 'storyboard-asset' && edge.sourceHandle === 'storyboard-out')) return []
    const next = { ...edge, source, target }
    const key = `${source}:${next.sourceHandle || ''}:${target}:${next.targetHandle || ''}`
    if (seen.has(key)) return []
    seen.add(key)
    return [next]
  })

  const storyboardConnectedVideos = new Set(unifiedEdges.filter((edge) => edge.targetHandle === 'storyboard-in').map((edge) => edge.target))
  const promptModeNodes = unifiedNodes.map((node) => {
    if (node.data.kind !== 'video-generator') return node
    const connected = storyboardConnectedVideos.has(node.id)
    const legacy = node.data as StudioNode['data'] & { compiledStoryboardPrompt?: unknown; compiledStoryboardError?: unknown }
    const { compiledStoryboardPrompt: _compiledStoryboardPrompt, compiledStoryboardError: _compiledStoryboardError, ...data } = legacy
    const shutter = migrateShutterSelection(data, data.motionCadence || data.frameRate || 24)
    if (data.promptMode) return { ...node, data: { ...data, ...shutter } }
    return {
      ...node,
      data: connected
        ? { ...data, ...shutter, promptMode: 'auto' as const, manualPromptDraft: data.prompt || '', manualPromptSeeded: data.prompt !== undefined, error: /(?:Storyboard|Continue|bridge)/i.test(data.error || '') ? undefined : data.error }
        : { ...data, ...shutter, promptMode: 'manual' as const, manualPromptDraft: data.prompt || '', manualPromptSeeded: true },
    }
  })

  return { nodes: promptModeNodes, edges: unifiedEdges }
}
