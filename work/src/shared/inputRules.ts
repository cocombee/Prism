import type { GenerationRequest, StudioNodeData } from './types'
import { activeMediaTag } from './generatedMedia'
import { nodeInputPorts, unavailableInputPortLabel } from './nodePorts'

export type InputFidelity = 'guide' | 'auto' | 'lock'
export interface ConnectedInputRule { referenceDescription?: string; tag: string; aliases?: string[]; label: string; rule: string; mode?: InputFidelity; toggleable?: boolean; edgeId?: string }

/** Keep adjustable fidelity rows reachable before fixed hard-rule rows. */
export function prioritizeConnectedInputRules(items: ConnectedInputRule[]): ConnectedInputRule[] {
  return items.map((item, index) => ({ item, index }))
    .sort((a, b) => Number(Boolean(b.item.toggleable)) - Number(Boolean(a.item.toggleable)) || a.index - b.index)
    .map(({ item }) => item)
}

export function supportsInputFidelity(source: StudioNodeData, targetHandle?: string | null): boolean {
  if (['character', 'wardrobe', 'location', 'element', 'style-reference', 'prompt', 'assistant', 'list'].includes(source.kind)) return false
  return ['storyboard-in', 'image-in', 'end-image', 'reference-in', 'video-reference-in', 'video-in'].includes(targetHandle || '')
}

const FLEXIBLE_REFERENCE_INTENT = /\b(?:inspir(?:e|ed|ation)|loose(?:ly)?|guide|guidance|adapt|reinterpret|reimagine|approximate|similar|mood|feel)\b/i
const STRICT_REFERENCE_INTENT = /\b(?:exact(?:ly)?|unchanged|unaltered|unmodified|identical|verbatim|authoritative|pixel-faithful|pixel faithful)\b|\b(?:do not|don't|never)\s+(?:alter|change|redraw|retype|replace|reinterpret|substitute|distress)|\boriginal\s+(?:letterforms?|weights?|spacing|proportions?|colou?rs?|layout)[^.!?\n]{0,120}\bintact\b|\bstay\s+(?:crisp|clean|untouched)\b/i
const REFERENCE_SUBJECT = /\b(?:attached|supplied|connected|reference|artworks?|logos?|marks?|lettering|images?|pixels?)\b/i
const IMAGE_REFERENCE_GUIDE = 'Use this image as loose visual guidance, preserving its intended subject while allowing composition and detail to adapt.'
const IMAGE_REFERENCE_AUTO = 'Preserve its intended subject, composition, and recognizable detail while automatically improving pixelation, artifacts, and weak detail.'
const IMAGE_REFERENCE_LOCK = 'Treat the supplied image as authoritative source material in its assigned visual role. For planar artwork, text, and logos, reserve a blank carrier and place the original source deterministically after generation; if every carrier cannot be verified, fail the Lock check instead of presenting invented content as exact. Other pictorial content uses the strongest preservation supported by the selected provider and may still be redrawn.'

/** Auto is prompt-sensitive: explicit flexibility wins locally; explicit preservation escalates to Lock strength. */
export function inferredAutoFidelity(prompt: string | undefined, tag?: string): InputFidelity {
  const authored = prompt?.trim()
  if (!authored) return 'auto'
  const localScopes = tag?.trim()
    ? authored.split(/\n+|(?<=[.!?])\s+/).filter((scope) => scope.includes(tag.trim()))
    : []
  const local = localScopes.join(' ')
  if (local && STRICT_REFERENCE_INTENT.test(local)) return 'lock'
  if (local && FLEXIBLE_REFERENCE_INTENT.test(local)) return 'guide'
  const strictReferenceScope = authored.split(/\n+|(?<=[.!?])\s+/).some((scope) => REFERENCE_SUBJECT.test(scope) && STRICT_REFERENCE_INTENT.test(scope))
  return strictReferenceScope ? 'lock' : 'auto'
}

function fidelityRule(mode: InputFidelity, guide: string, auto: string, lock: string, prompt?: string, tag?: string): string {
  if (mode === 'lock') return `LOCK RULE · ${lock}`
  if (mode === 'guide') return `GUIDE RULE · ${guide}`
  const inferred = inferredAutoFidelity(prompt, tag)
  if (inferred === 'lock') return `AUTO → PRESERVE RULE · The authored prompt requires exact preservation, so apply the strongest provider-supported preservation behavior. ${lock}`
  if (inferred === 'guide') return `AUTO → GUIDE RULE · The authored prompt explicitly allows interpretation, so apply this input as guidance. ${guide}`
  return `AUTO RULE · ${auto}`
}

/** New reference modes never become the legacy planar-artwork placement workflow. */
export function isLockedArtworkReference(reference: NonNullable<GenerationRequest['references']>[number]): boolean {
  return !reference.mediaReferenceMode && reference.fidelity === 'lock' && reference.role === 'reference' && Boolean(reference.path) && (!reference.mediaType || reference.mediaType === 'image')
}

/** Re-evaluate Auto after all directly authored and upstream Prompt text has been assembled. */
export function resolveAutoConnectedInputRule(rule: ConnectedInputRule, authoredPrompt?: string): ConnectedInputRule {
  if (rule.mode !== 'auto' || rule.label !== 'Image Reference') return rule
  return { ...rule, rule: fidelityRule('auto', IMAGE_REFERENCE_GUIDE, IMAGE_REFERENCE_AUTO, IMAGE_REFERENCE_LOCK, authoredPrompt, rule.tag) }
}

export function workflowTag(data: Pick<StudioNodeData, 'title'> & Partial<Pick<StudioNodeData, 'kind' | 'referenceTag' | 'generatedResults' | 'activeResultIndex'>>, fallback: string): string {
  return activeMediaTag(data, fallback)
}

export function connectedInputRule(source: StudioNodeData, target: StudioNodeData, targetHandle?: string | null, mode: InputFidelity = 'auto'): ConnectedInputRule {
  const handle = targetHandle || ''
  const tag = workflowTag(source, 'image-reference')
  const generator = ['image-generator', 'video-generator'].includes(target.kind)
  const native = target.falNative || target.higgsfieldNative
  const binding = native?.media?.find(item => item.portId === handle)
  const retiredPort = native?.retiredPorts?.find(port => port.id === handle)
  const currentPort = retiredPort && nodeInputPorts(target).find(port => port.id === handle)
  const retired = binding?.retired || retiredPort && (!currentPort || currentPort.maxConnections === 0)
  if (retired) return { tag, label: unavailableInputPortLabel(binding?.label || retiredPort?.label || handle), rule: 'This saved connection needs repair before generation.' }
  // Generators no longer consume the retired edge strength. Native frame/source roles remain schema-owned.
  if (generator) mode = 'auto'
  const referenceSocket = native ? Boolean(binding && ['reference-image', 'reference-video'].includes(binding.role)) : ['reference-in', 'reference', 'video-reference-in'].includes(handle)
  if ((generator || target.kind === 'storyboard') && referenceSocket && ['upload', 'output', 'image-generator', 'video-generator'].includes(source.kind)) return {
    tag, label: binding?.label || 'Media Reference', rule: 'Use only the roles and constraints explicitly assigned in the reference introduction and authored instructions. Other references retain their own assigned domains.',
  }
  if (generator && !native) {
    if (handle === 'storyboard-in' || ['storyboard', 'storyboard-asset'].includes(source.kind)) return { tag: workflowTag(source, 'storyboard'), label: 'Storyboard', rule: 'HARD RULE · Execute the authored action intervals, durations and transition boundaries once, preserving the authored continuity.' }
    if (handle === 'image-in' && target.kind === 'video-generator') return { tag: workflowTag(source, 'start-frame'), label: 'Starting Frame', rule: 'HARD RULE · Use the supplied frame as the opening visual state, then follow the authored action.' }
    if (handle === 'end-image') return { tag: workflowTag(source, 'end-frame'), label: 'Ending Frame', rule: 'HARD RULE · End at the supplied frame and preserve the authored transition into that visual state.' }
    if (handle === 'video-in') return { tag: workflowTag(source, 'source-video'), label: 'Video To Extend', rule: 'HARD RULE · Continue from the existing source video’s final state, preserving source timing and continuity.' }
  }
  const fidelity = !generator && supportsInputFidelity(source, targetHandle) ? { mode, toggleable: true } : {}
  const storyboardRule = (): ConnectedInputRule => ({ tag: workflowTag(source, 'storyboard'), label: 'Storyboard', rule: fidelityRule(mode, 'Use this storyboard as loose structural guidance; preserve its story intent while allowing reframing, retiming, and stronger transitions.', 'Preserve the storyboard’s subjects, shot order, timing intent, and continuity, while automatically improving weak framing, detail, transitions, or image quality.', 'Follow this storyboard exactly once as the locked shot plan, timing, framing, movement, and continuity structure.'), ...fidelity })
  if (handle === 'storyboard-in') return storyboardRule()
  if (target.higgsfieldNative) {
    const binding = target.higgsfieldNative.media?.find(item => item.portId === handle)
    if (binding && target.higgsfieldNative.endpointId.startsWith('bytedance/seedance-2.5/')) {
      const rules = {
        'start-frame': 'Use this image as the opening-frame authority, then follow the authored action.',
        'end-frame': 'Use this image as the ending-frame authority, preserving the authored transition into that state.',
        'source-video': target.higgsfieldNative.endpointId.endsWith('/video-extend') ? 'Use this source video as continuity context for the authored extension. Its duration is separate from the generated extension.' : 'Use this video as the existing shot to edit. Preserve source timing and untouched content while applying the authored changes.',
        'reference-image': 'Use this physical image for its authored visual-reference role. Identity, object and location authority comes from the connected reusable asset and written instruction.',
        'reference-video': 'Use this video for the authored motion, camera or performance guidance. Do not automatically copy its subjects, appearance or audio.',
        'reference-audio': 'Use this audio for the authored audio-reference role. It does not supply visual identity or camera instructions.',
      }
      return { tag: workflowTag(source, binding.role), label: binding.retired ? unavailableInputPortLabel(binding.label) : binding.label,
        rule: binding.retired ? 'This saved connection needs repair before generation.' : rules[binding.role] }
    }
    // Native Seedance retains the established Prompt, Storyboard, Style and semantic-asset rules below.
    if (!target.higgsfieldNative.endpointId.startsWith('bytedance/seedance-2.5/')) {
    const label = handle === 'video-in' ? 'Source Video' : handle === 'text-in' ? 'Prompt' : `${handle === 'character-in' ? 'Character' : handle === 'element-in' ? 'Element' : handle === 'location-in' ? 'Location' : 'Image'} Reference`
    return { tag: workflowTag(source, handle === 'video-in' ? 'source-video' : 'image-reference'), label, rule: 'Bound directly to the selected Higgsfield model input. The authored prompt and source video control the transformation.' }
    }
  }
  const imageReferenceRule = (guide: string, auto: string, lock: string) => fidelityRule(mode, guide, auto, lock, generator ? undefined : target.prompt, tag)
  if (source.kind === 'storyboard' || source.kind === 'storyboard-asset') return storyboardRule()
  if (handle === 'text-in' || handle === 'prompt' || source.kind === 'prompt' || source.kind === 'assistant') return { tag: workflowTag(source, 'prompt'), label: source.kind === 'list' ? 'Text List' : 'Prompt', rule: 'HARD RULE · Apply this connected text exactly once as the primary written instruction. Do not ask the user to repeat it or duplicate it.' }
  if (handle === 'style-in' || source.kind === 'style-reference') return { tag: workflowTag(source, 'style'), label: 'Style', rule: 'HARD RULE · Apply this style as the visual-language authority without copying depicted subjects. When text and a reference image disagree, prioritize the image for visibly provable medium, rendering, palette, lighting, texture, lens, and finish; retain text intent for anything the image cannot prove. Keep it consistent across every output.' }
  if (source.kind === 'character') return { tag: workflowTag(source, 'character'), label: 'Character Identity', rule: 'HARD RULE · Preserve this exact character identity across every shot; never merge, replace, or reinterpret it as another person. Narrative prominence comes only from the written shot prompt.' }
  if (source.kind === 'wardrobe') {
    const wardrobeTag = workflowTag(source, 'wardrobe')
    const characterTag = target.kind === 'character' ? workflowTag(target, 'character') : '@character'
    return { tag: wardrobeTag, label: 'Wardrobe', rule: `HARD RULE · ${wardrobeTag} governs the wardrobe of ${characterTag}. Preserve this garment identity, silhouette, construction, materials, colors, patterns, layering, fit, accessories, and worn state on ${characterTag} across every shot. Do not transfer the depicted person identity, apply this wardrobe to another character, or let another character inherit it without its own explicit Wardrobe connection.` }
  }
  if (source.kind === 'location') return { tag: workflowTag(source, 'location'), label: 'Location', rule: 'HARD RULE · Use this as the environment and scene-geometry authority; preserve its layout, perspective, atmosphere, and lighting logic.' }
  if (source.kind === 'element') return { tag: workflowTag(source, 'element'), label: 'Element', rule: 'HARD RULE · Use this as the object-design authority; preserve its proportions, materials, markings, construction, and attachment state.' }
  if (handle === 'end-image') return { tag: workflowTag(source, 'end-frame'), label: 'Ending Frame', rule: fidelityRule(mode, 'Use this as loose ending-state guidance; preserve the intended action result while allowing composition and detail to adapt.', 'Preserve the intended subject, composition, camera, and action result while automatically repairing pixelation, compression, noise, and weak detail.', 'Conclude at this frame pixel-for-pixel, including its composition, placement, texture, and visible quality.'), ...fidelity }
  if (target.kind === 'video-generator' && handle === 'image-in') return { tag: workflowTag(source, 'start-frame'), label: 'Starting Frame', rule: fidelityRule(mode, 'Use this as loose opening-state guidance; preserve the intended subject and action while allowing the framing and detail to adapt.', 'Preserve the intended subject, composition, camera, and opening action while automatically repairing pixelation, compression, noise, and weak detail.', 'Begin from this frame pixel-for-pixel before motion develops, including its composition, placement, texture, and visible quality.'), ...fidelity }
  if (handle === 'video-in' && target.kind === 'upscaler') return { tag: workflowTag(source, 'source-video'), label: 'Video To Upscale', rule: fidelityRule(mode, 'Preserve the video intent while reconstructing detail and cleaning compression artifacts.', 'Preserve every frame, timing, composition, and motion while automatically balancing restoration with artifact repair.', 'Preserve this video frame-for-frame while increasing resolution; do not retime, redesign, or replace content.'), ...fidelity }
  if (handle === 'video-in') return { tag: workflowTag(source, 'source-video'), label: 'Video To Extend', rule: fidelityRule(mode, 'Use this video as loose motion and continuity guidance while allowing a newly interpreted continuation.', 'Preserve its action, direction, timing intent, and continuity while automatically repairing artifacts and producing a cleaner continuation.', 'Treat this video as the exact existing timeline and continue pixel-faithfully from its final state without replacing its beginning.'), ...fidelity }
  if (handle === 'video-reference-in') return { tag: workflowTag(source, 'video-reference'), label: 'Video Reference', rule: fidelityRule(mode, 'Use its motion or performance as loose guidance while allowing visual adaptation; never treat its audio as visual content.', 'Preserve its temporal order, motion intent, performance, and appearance while automatically improving artifacts and weak detail; never treat its audio as visual content.', 'Match this video reference exactly in temporal order, motion, performance, appearance, and visible quality.'), ...fidelity }
  if (handle === 'audio-in' || handle === 'audio-reference-in') return { tag: workflowTag(source, 'audio-reference'), label: handle === 'audio-in' ? 'Audio' : 'Audio Reference', rule: 'HARD RULE · Use this audio only as sound, speech, rhythm, or timing authority; never reinterpret it as visual content.' }
  if (handle === 'image-in' && target.kind === 'image-editor') return { tag: workflowTag(source, 'source-image'), label: 'Source Image', rule: fidelityRule(mode, 'Use this as a loose subject and composition reference while applying the requested edit.', 'Preserve its subject and composition while automatically repairing low-quality pixels and applying the requested edit.', 'Use this pixel-for-pixel as the locked base image and change only what the edit instruction requests.'), ...fidelity }
  if (handle === 'image-in' && target.kind === 'upscaler') return { tag: workflowTag(source, 'source-image'), label: 'Image To Upscale', rule: fidelityRule(mode, 'Preserve the image intent while freely reconstructing detail and cleaning artifacts.', 'Preserve the composition and recognizable detail while automatically balancing faithful restoration with artifact repair.', 'Preserve this image pixel-for-pixel while increasing resolution; do not redesign it.'), ...fidelity }
  if (handle === 'media-in') return { tag: workflowTag(source, 'media'), label: 'Media Collection', rule: 'HARD RULE · Preserve this connected media item’s native type, assigned order, and role in the collection.' }
  if (source.kind === 'list') return { tag: workflowTag(source, 'list'), label: 'List', rule: 'HARD RULE · Preserve the connected list’s item order and configured Keep All or Pick One behavior exactly once.' }
  return { tag, label: 'Image Reference', rule: imageReferenceRule(IMAGE_REFERENCE_GUIDE, IMAGE_REFERENCE_AUTO, IMAGE_REFERENCE_LOCK), ...fidelity }
}
