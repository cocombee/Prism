import { type LucideIcon } from 'lucide-react'
import type { NodeKind } from '../../shared/types'
import { NODE_KIND_ICONS } from './iconSystem'

export type NodePaletteItem = {
  kind: NodeKind
  variant?: 'voice-change'
  label: string
  detail: string
  icon: LucideIcon
}

export const NODE_PALETTE: NodePaletteItem[] = [
  { kind: 'prompt', label: 'Prompt', detail: 'Local workflow utility', icon: NODE_KIND_ICONS.prompt! },
  { kind: 'upload', label: 'Media', detail: 'Local asset library', icon: NODE_KIND_ICONS.upload! },
  { kind: 'character', label: 'Character', detail: 'Semantic identity reference', icon: NODE_KIND_ICONS.character! },
  { kind: 'location', label: 'Location', detail: 'Semantic environment reference', icon: NODE_KIND_ICONS.location! },
  { kind: 'wardrobe', label: 'Wardrobe', detail: 'Semantic wardrobe reference', icon: NODE_KIND_ICONS.wardrobe! },
  { kind: 'element', label: 'Element', detail: 'Semantic object reference', icon: NODE_KIND_ICONS.element! },
  { kind: 'style-reference', label: 'Style', detail: 'Semantic visual-language reference', icon: NODE_KIND_ICONS['style-reference']! },
  { kind: 'list', label: 'List', detail: 'Synchronized image, video, or audio output batch', icon: NODE_KIND_ICONS.list! },
  { kind: 'storyboard', label: 'Storyboard', detail: 'Reusable model-aware shot sequence', icon: NODE_KIND_ICONS.storyboard! },
  { kind: 'voiceover', label: 'Voiceover', detail: 'ElevenLabs Eleven v3 / Fish Audio S1 + S2 Pro', icon: NODE_KIND_ICONS.voiceover! },
  { kind: 'voiceover', variant: 'voice-change', label: 'Voice Change', detail: 'ElevenLabs · Change the speaker of original audio', icon: NODE_KIND_ICONS.voiceover! },
  { kind: 'music-generator', label: 'Music', detail: 'ElevenLabs · Prompt or custom lyrics', icon: NODE_KIND_ICONS['music-generator']! },
  { kind: 'sound-effects', label: 'Sound Effects', detail: 'fal.ai · ElevenLabs SFX v2', icon: NODE_KIND_ICONS['sound-effects']! },
  { kind: 'router', label: 'Router', detail: 'Local pass-through connection utility', icon: NODE_KIND_ICONS.router! },
  { kind: 'image-generator', label: 'Image Generator', detail: 'fal.ai · GPT Image · Gemini Image', icon: NODE_KIND_ICONS['image-generator']! },
  { kind: 'upscaler', label: 'Image Upscaler', detail: 'fal.ai · Clarity Upscaler', icon: NODE_KIND_ICONS.upscaler! },
  { kind: 'video-generator', label: 'Video Generator', detail: 'fal.ai · Seedance 2 / Kling V3 + O3 / Veo 3.1 / Wan FPS', icon: NODE_KIND_ICONS['video-generator']! },
  { kind: 'gallery', label: 'Gallery', detail: 'View-only image, video, or audio collection', icon: NODE_KIND_ICONS.gallery! },
  { kind: 'frame', label: 'Frame', detail: 'Local canvas utility', icon: NODE_KIND_ICONS.frame! },
]

export const POPULAR_NODE_KINDS: NodeKind[] = ['prompt', 'image-generator', 'video-generator']

const popularKinds = new Set(POPULAR_NODE_KINDS)

export const ORDERED_NODE_PALETTE: NodePaletteItem[] = [
  ...POPULAR_NODE_KINDS.map((kind) => NODE_PALETTE.find((item) => item.kind === kind)!),
  ...NODE_PALETTE
    .filter((item) => !popularKinds.has(item.kind))
    .sort((left, right) => left.label.localeCompare(right.label, 'en')),
]
