import { describe, expect, it } from 'vitest'
import {
  AudioLines,
  Bot,
  Box,
  Clapperboard,
  FileInput,
  Folder,
  Folders,
  Frame,
  Image,
  ImagePlus,
  Images,
  LayoutDashboard,
  Library,
  Link2,
  MessageCircle,
  MessageSquareText,
  Mountain,
  Package,
  Palette,
  Route,
  Shapes,
  Sticker,
  StickyNote,
  UserRound,
  Video,
} from 'lucide-react'
import { ACTION_ICONS, APP_ICONS, ASSET_TYPE_ICONS, generatorInputIconFor, NODE_KIND_ICONS, PORT_ROLE_ICONS, SEMANTIC_ICONS } from './iconSystem'

describe('semantic icon system', () => {
  it('uses literal project, canvas, document, and asset-library glyphs', () => {
    expect(APP_ICONS.projects).toBe(Folders)
    expect(APP_ICONS.project).toBe(Folder)
    expect(APP_ICONS.projectDocument).toBe(FileInput)
    expect(APP_ICONS.canvas).toBe(LayoutDashboard)
    expect(APP_ICONS.assets).toBe(Library)
  })

  it('does not recycle adjacent node concepts for legacy and utility nodes', () => {
    expect(NODE_KIND_ICONS.frame).toBe(Frame)
    expect(NODE_KIND_ICONS.router).toBe(Route)
    expect(NODE_KIND_ICONS.gallery).toBe(Images)
    expect(NODE_KIND_ICONS.output).toBe(Package)
    expect(NODE_KIND_ICONS['sticky-note']).toBe(StickyNote)
    expect(NODE_KIND_ICONS.comment).toBe(MessageCircle)
    expect(NODE_KIND_ICONS.sticker).toBe(Sticker)
    expect(new Set([NODE_KIND_ICONS.frame, NODE_KIND_ICONS.router, NODE_KIND_ICONS.gallery, NODE_KIND_ICONS.output, NODE_KIND_ICONS['sticky-note'], NODE_KIND_ICONS.comment, NODE_KIND_ICONS.sticker]).size).toBe(7)
  })

  it('keeps named concepts on one simple global silhouette', () => {
    expect(SEMANTIC_ICONS.character).toBe(UserRound)
    expect(SEMANTIC_ICONS.element).toBe(Box)
    expect(SEMANTIC_ICONS.location).toBe(Mountain)
    expect(SEMANTIC_ICONS.prompt).toBe(MessageSquareText)
    expect(SEMANTIC_ICONS.storyboard).toBe(Clapperboard)
    expect(SEMANTIC_ICONS.style).toBe(Palette)
    expect(SEMANTIC_ICONS.image).toBe(Image)
    expect(SEMANTIC_ICONS.video).toBe(Video)
    expect(SEMANTIC_ICONS.audio).toBe(AudioLines)
    expect(ASSET_TYPE_ICONS.character).toBe(SEMANTIC_ICONS.character)
    expect(NODE_KIND_ICONS.character).toBe(SEMANTIC_ICONS.character)
    expect(PORT_ROLE_ICONS['character-reference']).toBe(SEMANTIC_ICONS.character)
    expect(generatorInputIconFor('character-in', 'image', 'video-generator')).toBe(SEMANTIC_ICONS.character)
    expect(generatorInputIconFor('element-in', 'image', 'video-generator')).toBe(SEMANTIC_ICONS.element)
    expect(generatorInputIconFor('location-in', 'image', 'video-generator')).toBe(SEMANTIC_ICONS.location)
    expect(generatorInputIconFor('text-in', 'text', 'video-generator')).toBe(SEMANTIC_ICONS.prompt)
    expect(generatorInputIconFor('video-reference-in', 'video', 'video-generator')).toBe(SEMANTIC_ICONS.video)
    expect(generatorInputIconFor('audio-reference-in', 'audio', 'video-generator')).toBe(SEMANTIC_ICONS.audio)
  })

  it('reserves grouped icons for concepts that actually represent collections', () => {
    expect(generatorInputIconFor('image-in', 'image', 'image-generator')).toBe(ImagePlus)
    expect(generatorInputIconFor('reference-in', 'image', 'image-generator')).toBe(Shapes)
    expect(generatorInputIconFor('reference-in', 'image', 'video-generator')).toBe(Images)
    expect(PORT_ROLE_ICONS['semantic-reference']).toBe(Shapes)
    expect(PORT_ROLE_ICONS['image-reference']).toBe(Images)
    expect(PORT_ROLE_ICONS['media-collection']).toBe(SEMANTIC_ICONS.collection)
  })

  it('keeps Connect on the shared link action rather than a workflow identity glyph', () => {
    expect(Link2).not.toBe(NODE_KIND_ICONS.router)
    expect(ACTION_ICONS.connect).toBe(Link2)
  })
})
