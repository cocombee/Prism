import {
  ArrowUpRight,
  AudioLines,
  Bot,
  Box,
  Clapperboard,
  Clock3,
  FileInput,
  Files,
  Folder,
  FolderOpen,
  Folders,
  Frame,
  House,
  Image,
  ImagePlus,
  LayoutDashboard,
  LayoutGrid,
  Layers3,
  Library,
  ListOrdered,
  Link2,
  Maximize2,
  MessageCircle,
  MessageSquareText,
  Mic2,
  Mountain,
  Music2,
  Package,
  Palette,
  PencilLine,
  Route,
  Shapes,
  Shirt,
  SkipBack,
  SkipForward,
  Sticker,
  StickyNote,
  UserRound,
  Video,
  Images,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { ConnectionSignal } from '../../shared/nodeConnections'
import type { NodeKind } from '../../shared/types'

/** One simple semantic silhouette per named concept, shared by every surface. */
export const SEMANTIC_ICONS = {
  project: Folder,
  canvas: LayoutDashboard,
  assets: Library,
  prompt: MessageSquareText,
  storyboard: Clapperboard,
  character: UserRound,
  element: Box,
  location: Mountain,
  wardrobe: Shirt,
  style: Palette,
  image: Image,
  video: Video,
  audio: AudioLines,
  collection: Layers3,
} as const satisfies Record<string, LucideIcon>

export const ACTION_ICONS = {
  connect: Link2,
  options: Settings,
  export: ArrowUpRight,
} as const satisfies Record<string, LucideIcon>

export const APP_ICONS = {
  home: House,
  projects: Folders,
  recentProjects: Clock3,
  importProject: FolderOpen,
  projectDocument: FileInput,
  project: SEMANTIC_ICONS.project,
  canvas: SEMANTIC_ICONS.canvas,
  assets: SEMANTIC_ICONS.assets,
} as const satisfies Record<string, LucideIcon>

export const ASSET_TYPE_ICONS = {
  all: LayoutGrid,
  character: SEMANTIC_ICONS.character,
  element: SEMANTIC_ICONS.element,
  location: SEMANTIC_ICONS.location,
  wardrobe: SEMANTIC_ICONS.wardrobe,
  style: SEMANTIC_ICONS.style,
  storyboard: SEMANTIC_ICONS.storyboard,
  image: SEMANTIC_ICONS.image,
  video: SEMANTIC_ICONS.video,
  audio: SEMANTIC_ICONS.audio,
} as const satisfies Record<string, LucideIcon>

export const NODE_KIND_ICONS: Partial<Record<NodeKind, LucideIcon>> = {
  prompt: SEMANTIC_ICONS.prompt,
  upload: Files,
  'image-generator': SEMANTIC_ICONS.image,
  'image-editor': SEMANTIC_ICONS.image,
  upscaler: Maximize2,
  'video-generator': SEMANTIC_ICONS.video,
  gallery: Images,
  output: Package,
  frame: Frame,
  'sticky-note': StickyNote,
  comment: MessageCircle,
  sticker: Sticker,
  drawing: PencilLine,
  character: SEMANTIC_ICONS.character,
  location: SEMANTIC_ICONS.location,
  wardrobe: SEMANTIC_ICONS.wardrobe,
  element: SEMANTIC_ICONS.element,
  'style-reference': SEMANTIC_ICONS.style,
  list: ListOrdered,
  router: Route,
  voiceover: Mic2,
  'sound-effects': SEMANTIC_ICONS.audio,
  'music-generator': Music2,
  storyboard: SEMANTIC_ICONS.storyboard,
  'storyboard-asset': SEMANTIC_ICONS.storyboard,
  assistant: Bot,
}

export function generatorInputIconFor(id: string, signal: ConnectionSignal, kind: NodeKind): LucideIcon {
  if (id === 'text-in' || signal === 'text') return SEMANTIC_ICONS.prompt
  if (id === 'storyboard-in' || signal === 'storyboard') return SEMANTIC_ICONS.storyboard
  if (id === 'image-in') return kind === 'image-generator' ? ImagePlus : SkipBack
  if (id === 'end-image') return SkipForward
  if (id === 'character-in') return SEMANTIC_ICONS.character
  if (id === 'wardrobe-in') return SEMANTIC_ICONS.wardrobe
  if (id === 'element-in') return SEMANTIC_ICONS.element
  if (id === 'location-in') return SEMANTIC_ICONS.location
  if (id === 'reference-in') return kind === 'image-generator' || kind === 'image-editor' ? Shapes : Images
  if (id === 'style-in' || signal === 'style') return SEMANTIC_ICONS.style
  if (id === 'video-reference-in' || id === 'video-in' || signal === 'video') return SEMANTIC_ICONS.video
  if (signal === 'audio') return SEMANTIC_ICONS.audio
  if (signal === 'mixed') return SEMANTIC_ICONS.collection
  return SEMANTIC_ICONS.image
}

export const PORT_SIGNAL_ICONS = {
  text: SEMANTIC_ICONS.prompt,
  image: SEMANTIC_ICONS.image,
  video: SEMANTIC_ICONS.video,
  audio: SEMANTIC_ICONS.audio,
  style: SEMANTIC_ICONS.style,
  storyboard: SEMANTIC_ICONS.storyboard,
  mixed: SEMANTIC_ICONS.collection,
} as const satisfies Record<ConnectionSignal, LucideIcon>

export const PORT_ROLE_ICONS = {
  'start-frame': SkipBack,
  'end-frame': SkipForward,
  'single-mixed': Shapes,
  prompt: SEMANTIC_ICONS.prompt,
  'image-reference': Images,
  'semantic-reference': Shapes,
  'character-reference': SEMANTIC_ICONS.character,
  'wardrobe-reference': SEMANTIC_ICONS.wardrobe,
  'element-reference': SEMANTIC_ICONS.element,
  'location-reference': SEMANTIC_ICONS.location,
  'source-video': SEMANTIC_ICONS.video,
  'reference-video': SEMANTIC_ICONS.video,
  'reference-audio': SEMANTIC_ICONS.audio,
  'media-collection': SEMANTIC_ICONS.collection,
} as const satisfies Record<string, LucideIcon>
