import type { GenerationRequest, StoryboardPanel, StudioNode, StudioNodeData } from './types'
import type { ResolvedWorkflowInput } from './workflowResolver'

function uniquePrompt(parts: Array<string | undefined>): string {
  return [...new Set(parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)))].join('\n\n')
}

export function storyboardCompileFingerprint(
  data: Pick<StudioNodeData, 'storyboardPanels' | 'storyboardDuration' | 'storyboardMode' | 'storyboardModelId'>,
): string {
  return JSON.stringify({
    panels: (data.storyboardPanels || []).map(({ asset: _asset, ...panel }) => panel),
    duration: data.storyboardDuration,
    mode: data.storyboardMode,
    modelId: data.storyboardModelId,
  })
}

/** Compile the complete plan into one storyboard-sheet image. The structured
 * panel data remains attached to the Storyboard node for downstream timing;
 * this request creates the single visual sheet the user can deploy.
 */
export function buildStoryboardSheetImageRequest(
  storyboard: StudioNode,
  panels: StoryboardPanel[],
  upstream: ResolvedWorkflowInput,
): GenerationRequest {
  const panelPlan = panels.map((panel, index) => [
    `Panel ${index + 1}`,
    `Duration: ${panel.duration === 'auto' ? '1s' : `${panel.duration}s`}`,
    `Shot Size: ${panel.shotSize || 'wide'}`,
    `Camera: ${panel.camera || 'static'}`,
    panel.audioCue?.trim() ? `Audio Cue: ${panel.audioCue.trim()}` : undefined,
    panel.prompt.trim(),
  ].filter(Boolean).join(' · ')).join('\n')
  return {
    nodeId: storyboard.id,
    kind: 'image-generator',
    prompt: uniquePrompt([
      `Create one clean cinematic storyboard sheet containing exactly ${panels.length} clearly separated numbered panels in reading order. Do not merge panels, omit panels, or add extra panels. Keep recurring subjects visually consistent across the complete sheet.`,
      panelPlan,
      upstream.prompt,
    ]),
    aspectRatio: '16:9',
    quantity: 1,
    imageProvider: 'fal',
    imageModelId: 'fal-ai/nano-banana-pro/edit',
    outputFormat: 'png',
    imageResolution: '2K',
    references: upstream.references.map((reference) => ({ ...reference })),
    connectionRules: upstream.connectionRules.map((rule) => ({ ...rule })),
  }
}
