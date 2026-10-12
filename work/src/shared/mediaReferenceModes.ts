import type { Edge } from '@xyflow/react'
import type { MediaReferenceMode, StudioNode, StudioNodeData } from './types'
import { connectionCompatibilityError, outputSignalFor } from './nodeConnections'
import { activeGeneratedResult } from './generatedMedia'
import { workflowTag } from './inputRules'

export type ReferenceMediaType = 'image' | 'video' | 'audio'

const GENERIC_MEDIA_KINDS = new Set<StudioNodeData['kind']>(['upload', 'output', 'image-generator', 'image-editor', 'upscaler', 'video-generator', 'voiceover', 'sound-effects', 'music-generator'])

/** A generator's declared output socket is not evidence that it has produced media. */
export function materializedReferenceMediaType(data: StudioNodeData): ReferenceMediaType | undefined {
  if (!GENERIC_MEDIA_KINDS.has(data.kind)) return undefined
  const selected = activeGeneratedResult(data)
  if (selected) return selected.path || selected.url ? selected.type : undefined
  if (!(data.outputPath || data.outputUrl || data.assetPath || data.assetUrl)) return undefined
  const type = outputSignalFor(data)
  return type === 'image' || type === 'video' || type === 'audio' ? type : undefined
}

export function mediaReferenceModes(type: ReferenceMediaType): Array<{ value: MediaReferenceMode; label: string; tooltip: string }> {
  if (type === 'audio') return [
    { value: 'lip-sync', label: 'Lip-sync', tooltip: 'Assign the speaker and synchronize visible speech to the recording. Override by typing.' },
    { value: 'sound', label: 'Sound', tooltip: 'Use music, ambience, effects, off-screen narration or audible beats as described. Override by typing.' },
  ]
  return [
    { value: 'reference', label: 'Reference', tooltip: 'Use this media according to its editable Description. Override by typing.' },
    type === 'video'
      ? { value: 'blocking', label: 'Blocking', tooltip: 'Use camera, placement and travel paths. Timecoded action supplies articulated movement; supplied assets determine appearance. Override by typing.' }
      : { value: 'composition', label: 'Composition', tooltip: 'Use framing, perspective and spatial placement. Connected subjects and Location supply appearance. Override by typing.' },
    { value: 'object', label: 'Object', tooltip: 'Describe the object to replace and its connected replacement. Preserve the remaining scene. Override by typing.' },
    { value: 'background', label: 'Background', tooltip: 'Use a connected Location to replace the background; preserve foreground subjects. Override by typing.' },
  ]
}

/** Legacy audio choices remain stored; the two visible purposes do not rewrite authored text. */
export function effectiveMediaReferenceMode(data: StudioNodeData, type: ReferenceMediaType): MediaReferenceMode {
  if (type === 'audio') return data.kind === 'voiceover' || data.mediaReferenceMode === 'lip-sync' ? 'lip-sync' : 'sound'
  return mediaReferenceModes(type).some(option => option.value === data.mediaReferenceMode) ? data.mediaReferenceMode! : 'reference'
}

/** Only real reference sockets count; source video and Starting/Ending Frames do not. */
export function mediaReferenceConnectionType(sourceId: string, nodes: StudioNode[], edges: Edge[]): ReferenceMediaType | undefined {
  const source = nodes.find(node => node.id === sourceId)
  const type = source && materializedReferenceMediaType(source.data)
  return type && compatibleMediaGeneratorConnection(sourceId, nodes, edges, true) ? type : undefined
}

/** Validate each hop, retaining the original media type through pass-through nodes. */
export function compatibleMediaGeneratorConnection(sourceId: string, nodes: StudioNode[], edges: Edge[], referenceOnly = false): boolean {
  const source = nodes.find(node => node.id === sourceId)
  if (!source) return false
  const type = materializedReferenceMediaType(source.data) || outputSignalFor(source.data)
  const pending = [{ id: sourceId, reference: false }], seen = new Set<string>()
  while (pending.length) {
    const item = pending.pop()!, key = `${item.id}:${item.reference}`
    if (seen.has(key)) continue
    seen.add(key)
    const current = nodes.find(node => node.id === item.id)!
    const currentData = current.data.kind === 'router' ? { ...current.data, routeSignal: type }
      : current.data.kind === 'list' ? { ...current.data, listSignal: type } : current.data
    for (const edge of edges.filter(edge => edge.source === item.id)) {
      const target = nodes.find(node => node.id === edge.target)
      if (!target) continue
      if (connectionCompatibilityError(currentData, target.data, edge.sourceHandle, edge.targetHandle)) continue
      const binding = [...(target.data.falNative?.media || []), ...(target.data.higgsfieldNative?.media || [])].find(binding => !binding.retired && binding.portId === edge.targetHandle)
      const reference = item.reference || ['reference', 'reference-in', 'video-reference-in', 'audio-reference-in'].includes(edge.targetHandle || '') || Boolean(binding && /reference/.test(binding.role))
      if (['image-generator', 'video-generator'].includes(target.data.kind)) {
        if (type === 'audio' && target.data.kind === 'image-generator') continue
        if (!referenceOnly || reference) return true
      } else if (['router', 'list', 'storyboard'].includes(target.data.kind) || !referenceOnly && target.data.kind === 'character') pending.push({ id: target.id, reference })
    }
  }
  return false
}

export function mediaReferenceDescriptionTemplate(data: StudioNodeData, mode: MediaReferenceMode, type: ReferenceMediaType): string {
  const tag = workflowTag(data, 'reference')
  if (type === 'audio') {
    if (mode === 'lip-sync') return `${tag} supplies the original speech recording for ${data.kind === 'voiceover' ? 'the speaking subject explicitly assigned in the timecoded action instructions' : '[speaker reference]' }. Use the recording once at its original speed and tempo. Use the complete original recording as the dialogue soundtrack, from the first recorded syllable through the last, including any introductory or lead-in words; play the full recording once without skipping any part. Do not edit, resynthesize, retune, time-stretch or truncate it. Preserve its original voice, pronunciation, accent, pitch, speed, emotion, pauses and timeline alignment. The written sentence identifies the words; the recording determines how and when they are spoken. Preserve every word and syllable through the final word, the original spacing between words and phrases, and silence wherever the recording is silent. Align recording time zero with video time zero unless an explicit different start time is authored. Synchronize that speaker’s visible mouth and jaw movement with the recorded syllables; settle the mouth during pauses and after the final spoken syllable. After the recording ends, keep the remaining video interval silent unless other audio is explicitly authored. A longer video duration does not authorize stretching or repeating the recording, or adding speech to fill the remaining time. The recording supplies no visual identity or appearance. Do not assign this speech to other subjects or invent additional dialogue.`
    if (mode === 'sound') return `${tag} supplies the music, ambience, sound effects or off-screen narration explicitly assigned in the audio instructions. Preserve its audible character and timing. Synchronize written actions or cuts to its audible beats only when requested. It supplies no visual identity or automatic mouth movement; do not turn non-speech sound into dialogue.`
    if (mode === 'timing') return `${tag} supplies audible beats and event timing for the actions explicitly assigned to it. Synchronize those actions to the corresponding moments in the recording, with physically continuous movement between cues. It supplies no visual identity, appearance or automatic speech assignment.`
    return `${tag} is the supplied audio recording. Use its sound, speech or timing only as explicitly assigned in the action and audio instructions. It supplies no visual identity or appearance; do not invent a speaker assignment or additional dialogue.`
  }
  if (mode === 'blocking') return `${tag} — Strict camera and blocking reference. Reproduce its camera choreography, height changes, orbit direction, framing progression, subject scale, travel paths, relative positions, overtaking and event timing at the assigned playback speed. It controls spatial movement and timing only. Translate proxy travel into live-action human movement; the timecoded action instructions supply articulated walking, gestures, expressions and eyelines. Supplied identity, wardrobe, prop and environment references control finished appearance. Do not copy proxy bodies, rigid limb poses or rendered surfaces.`
  if (mode === 'composition') return `${tag} — Strict composition reference. Match its framing, perspective, viewing axis, subject scale and spatial placement. Use the specified identity, outfit, object and environment references for finished appearance; preserve their exact assigned identities, forms and materials. The composition reference contributes no replacement identity or unassigned appearance.`
  if (mode === 'object') return `${tag} — Source ${type} for object replacement. Replace only [original object] with the object from [replacement reference]. Preserve every other subject, scene geometry, framing, lighting and material${type === 'video' ? ', together with the original camera path, retained-subject motion and event timing' : ''}. The replacement changes that object only; it adds no extra subject.`
  if (mode === 'background') return `${tag} — Source ${type} for background replacement. Replace only the background with the environment from [target location reference]. Preserve foreground subjects, their exact identities, outfits, objects, relative scale and framing${type === 'video' ? ', together with their motion, the camera path and event timing' : ''}. The location reference controls the replacement environment only; it contributes no foreground subject.`
  return `${tag} — Supplied ${type} reference. Preserve the visual details explicitly assigned to this reference in the prompt. Keep its role separate from the identities, outfits, objects and environment assigned to other references${type === 'video' ? '; its audio contributes nothing unless explicitly assigned' : ''}.`

}

/** Modes seed editable prose; they never silently select a native editing task. */
export function mediaReferenceModePatch(data: StudioNodeData, mode: MediaReferenceMode, type: ReferenceMediaType): Partial<StudioNodeData> | undefined {
  if (!mediaReferenceModes(type).some(option => option.value === mode) || mode === effectiveMediaReferenceMode(data, type)) return undefined
  return { mediaReferenceMode: mode, referenceDescription: mediaReferenceDescriptionTemplate(data, mode, type), referenceDescriptionMode: 'authored', error: undefined }
}
