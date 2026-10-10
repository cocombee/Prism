import type { ModelMenuMetadata } from './modelCatalogMenu'

export interface FalCatalogModel {
  id: string
  label: string
  category: string
  description?: string
  updatedAt?: string
  catalog: ModelMenuMetadata
}

const companies: Readonly<Record<string, string>> = {
  bytedance: 'ByteDance', seedance: 'ByteDance', minimax: 'MiniMax', hailuo: 'MiniMax',
  kling: 'Kling', 'kling-video': 'Kling', kuaishou: 'Kling', wan: 'Alibaba', alibaba: 'Alibaba',
  flux: 'Black Forest Labs', 'flux-pro': 'Black Forest Labs', 'flux-2': 'Black Forest Labs',
  google: 'Google', veo: 'Google', imagen: 'Google', 'nano-banana': 'Google',
  openai: 'OpenAI', 'gpt-image': 'OpenAI', elevenlabs: 'ElevenLabs', fish: 'Fish Audio',
  ltx: 'Lightricks', 'ltx-video': 'Lightricks', lightricks: 'Lightricks', pixverse: 'PixVerse',
  runway: 'Runway', 'fal-ai': 'fal.ai',
}
const modeLabels: Readonly<Record<string, string>> = {
  'text-to-image': 'Text to Image', 'image-to-image': 'Image to Image',
  'text-to-video': 'Text to Video', 'image-to-video': 'Image to Video',
  'video-to-video': 'Video to Video', 'reference-to-video': 'Reference to Video',
  'text-to-speech': 'Text to Speech', 'text-to-audio': 'Text to Audio',
  'audio-to-audio': 'Audio to Audio', 'image-to-audio': 'Image to Audio',
  'video-to-audio': 'Video to Audio', 'audio-to-video': 'Audio to Video',
}
const record = (value: unknown): Record<string, unknown> | undefined => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
const text = (value: unknown): string | undefined => typeof value === 'string' && Boolean(value.trim()) ? value.trim() : undefined

export function falEndpointId(value: unknown): string {
  if (typeof value !== 'string' || value.length > 1024 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)*$/.test(value)) throw new Error('Invalid fal model endpoint identifier.')
  return value
}

/** Read discovery data only; no executable schema or invented release date. */
export function falCatalogModel(value: unknown): FalCatalogModel | null {
  const entry = record(value)
  if (!entry) throw new Error('Malformed fal model record.')
  const id = falEndpointId(entry.endpoint_id)
  const metadata = record(entry.metadata)
  const label = text(metadata?.display_name), category = text(metadata?.category)
  if (!metadata || !label || !category) throw new Error('Missing fal model metadata.')
  if (metadata.status !== 'active' || metadata.kind && metadata.kind !== 'inference') return null
  // Standalone 3D and training never belong in Prism's 2D production flows.
  if (/3d|mesh|training|fine-tun/i.test(category)) return null
  if (!(category in modeLabels) && !/image|video|audio|speech/.test(category)) return null
  const parts = id.split('/')
  const vendor = parts[0] === 'fal-ai' ? parts[1] || parts[0] : parts[0]
  const knownVendor = Object.keys(companies).sort((a, b) => b.length - a.length).find((key) => vendor === key || vendor.startsWith(`${key}-`) || new RegExp(`^${key}[0-9]`).test(vendor))
  const company = knownVendor ? companies[knownVendor] : vendor.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
  const mode = modeLabels[parts.at(-1)!] || modeLabels[category] || category.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
  // Release labels preserve variants (Max, Turbo, Pro) while grouping input modes.
  const release = label.replace(/\s*[-·:]?\s*(?:Text[ -]to[ -](?:Video|Image|Audio|Speech)|Image[ -]to[ -](?:Video|Image|Audio)|Reference[ -]to[ -]Video|Video[ -]to[ -](?:Video|Audio)|Audio[ -]to[ -](?:Video|Audio))\s*$/i, '').trim() || label
  const releasedAt = text(metadata.date)
  return { id, label, category, description: text(metadata.description), updatedAt: text(metadata.updated_at),
    catalog: { service: 'fal.ai', company, release, mode, ...(releasedAt ? { releasedAt } : {}) } }
}
