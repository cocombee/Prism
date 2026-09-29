import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { activeVideoPromptMode, migrateVideoUserSeed, nextVideoPromptRovingMode, resetManualPrompt, switchVideoPromptMode, videoPromptCompileFingerprint, videoPromptRovingTabIndex } from './videoPromptMode'

const video = (data: Partial<StudioNode['data']> = {}): StudioNode => ({ id: 'video', type: 'studio', position: { x: 10, y: 20 }, selected: true, data: { kind: 'video-generator', title: 'Video', prompt: 'legacy manual', ...data } })
const storyboard = (prompt = 'Beat action.'): StudioNode => ({ id: 'board', type: 'storyboard', position: { x: 0, y: 0 }, data: { kind: 'storyboard', title: 'Board', storyboardMode: 'single', storyboardDuration: 4, storyboardPanels: [{ id: 'p1', prompt, duration: 4, shotSize: 'wide', camera: 'static' }] } })
const edge: Edge = { id: 'story-edge', source: 'board', target: 'video', targetHandle: 'storyboard-in', data: { inputFidelity: 'auto' } }

describe('Video Auto/Manual prompt mode', () => {
  it('defaults connected legacy to Auto and unconnected legacy to Manual while preserving explicit unconnected Auto', () => {
    expect(activeVideoPromptMode(video().data, true)).toBe('auto')
    expect(activeVideoPromptMode(video().data, false)).toBe('manual')
    expect(activeVideoPromptMode(video({ promptMode: 'auto' }).data, false)).toBe('auto')
  })

  it('seeds Manual once, preserves it across switching, and resets only explicitly', () => {
    const first = switchVideoPromptMode(video({ prompt: undefined, promptMode: 'auto', manualPromptSeeded: false }), 'manual', 'AUTO ONE')
    expect(first).toMatchObject({ promptMode: 'manual', manualPromptDraft: 'AUTO ONE', manualPromptSeeded: true })
    const later = switchVideoPromptMode(video({ ...first, manualPromptDraft: 'MY DRAFT' }), 'auto', 'AUTO TWO')
    expect(later.manualPromptDraft).toBe('MY DRAFT')
    expect(switchVideoPromptMode(video({ ...later }), 'manual', 'AUTO THREE').manualPromptDraft).toBe('MY DRAFT')
    expect(resetManualPrompt(video({ ...later, promptMode: 'manual' }), 'AUTO THREE')).toMatchObject({ manualPromptDraft: 'AUTO THREE', promptMode: 'manual' })
  })

  it('seeds first User from Locked and preserves intentional empty seeded User work', () => {
    expect(switchVideoPromptMode(video({ prompt: 'PRIOR', promptMode: 'auto', manualPromptSeeded: false }), 'manual', 'AUTO')).toMatchObject({ manualPromptDraft: 'AUTO', manualPromptSeeded: true })
    expect(switchVideoPromptMode(video({ prompt: '', manualPromptDraft: '', manualPromptSeeded: true }), 'manual', 'AUTO')).toMatchObject({ manualPromptDraft: '', manualPromptSeeded: true })
  })

  it('never rewrites an already-seeded User body, including legacy-looking bytes', () => {
    const legacyLooking = 'Storyboard sequence:\r\n  user-authored body without semantic tags.'
    expect(migrateVideoUserSeed(video({ manualPromptDraft: legacyLooking, manualPromptSeeded: true, manualPromptSeedVersion: 1 }), 'LONG LOCKED')).toMatchObject({ manualPromptDraft: legacyLooking, manualPromptSeeded: true, manualPromptSeedVersion: 2 })
    expect(migrateVideoUserSeed(video({ manualPromptDraft: 'my authored edit', manualPromptSeeded: true }), 'LONG LOCKED').manualPromptDraft).toBe('my authored edit')
    expect(migrateVideoUserSeed(video({ manualPromptDraft: '', manualPromptSeeded: true }), 'LONG LOCKED').manualPromptDraft).toBe('')
    const activeRenderer = readFileSync(new URL('../renderer/src/AppNext.tsx', import.meta.url), 'utf8')
    expect(activeRenderer).not.toContain("/^Storyboard sequence:/i.test(node.data.manualPromptDraft || '')")
    expect(activeRenderer).not.toContain('manualPromptDraft: lockedPrompt, manualPromptSeedVersion: 2')
  })

  it('mirrors Locked tag bytes on initial User entry and Reset, then leaves tag editing wholly user-owned', () => {
    const locked = 'REFERENCE AUTHORITY\r\n@actor-c remains wired.\n@location-a establishes place.'
    const first = switchVideoPromptMode(video({ promptMode: 'auto', manualPromptSeeded: false }), 'manual', locked)
    expect(first.manualPromptDraft).toBe(locked)
    const edited = `${locked.replace('@actor-c', 'Actor C')}\n@manually-added-token`
    const seeded = video({ ...first, promptMode: 'manual', manualPromptDraft: edited })
    expect(switchVideoPromptMode(seeded, 'auto', locked).manualPromptDraft).toBe(edited)
    expect(switchVideoPromptMode(seeded, 'manual', locked).manualPromptDraft).toBe(edited)
    expect(resetManualPrompt(seeded, locked).manualPromptDraft).toBe(locked)
  })

  it('keeps the active purple connected-tag renderer graph-truth driven in Locked and User modes', () => {
    const nodeCard = readFileSync(new URL('../renderer/src/NodeCardNext.tsx', import.meta.url), 'utf8')
    const taggedEditor = readFileSync(new URL('../renderer/src/TaggedPromptTextarea.tsx', import.meta.url), 'utf8')
    const styles = readFileSync(new URL('../renderer/src/styles-next.css', import.meta.url), 'utf8')
    expect(nodeCard).toContain('value={videoPrompt?.activePrompt ?? data.prompt ?? \'\'}')
    expect(nodeCard).toContain('connectedTags={connectedPromptTags}')
    expect(nodeCard).toContain("availableTags={videoPrompt?.mode === 'auto' ? [] : availablePromptTags}")
    expect(taggedEditor).toContain("className={range.active ? 'is-active' : 'is-inactive'}")
    expect(styles).toContain('.tagged-prompt-highlight mark.is-active { color: #b99cff;')
    expect(styles).toContain('.tagged-prompt-highlight mark.is-inactive { color: inherit; }')
  })

  it('moves the roving Tab stop independently from selection and resets it to selected mode', () => {
    expect(nextVideoPromptRovingMode('manual', 'ArrowLeft')).toBe('auto')
    expect(nextVideoPromptRovingMode('manual', 'Home')).toBe('auto')
    expect(nextVideoPromptRovingMode('auto', 'ArrowRight')).toBe('manual')
    expect(nextVideoPromptRovingMode('auto', 'End')).toBe('manual')
    expect(videoPromptRovingTabIndex('auto', 'auto')).toBe(0)
    expect(videoPromptRovingTabIndex('manual', 'auto')).toBe(-1)
    expect(videoPromptRovingTabIndex('auto', 'manual')).toBe(-1)
    expect(videoPromptRovingTabIndex('manual', 'manual')).toBe(0)
  })

  it('traverses only recursive upstream authority and fidelity inputs', () => {
    const board = storyboard()
    const target = video()
    const authority: StudioNode = { id: 'authority', type: 'studio', position: { x: 2, y: 2 }, data: { kind: 'location', title: 'Station', referenceTag: '@station', prompt: 'Rainy platform.' } }
    const unrelated: StudioNode = { id: 'unrelated', type: 'studio', position: { x: 9, y: 9 }, data: { kind: 'prompt', title: 'Other', prompt: 'Unrelated A' } }
    const unrelatedTarget: StudioNode = { id: 'unrelated-target', type: 'studio', position: { x: 10, y: 10 }, data: { kind: 'image-generator', title: 'Other Image' } }
    const graphEdges: Edge[] = [edge, { id: 'authority-edge', source: authority.id, target: board.id, targetHandle: 'location-in' }, { id: 'unrelated-edge', source: unrelated.id, target: unrelatedTarget.id, targetHandle: 'text-in' }]
    const base = videoPromptCompileFingerprint(target, [board, target, authority, unrelated, unrelatedTarget], graphEdges)
    expect(videoPromptCompileFingerprint(target, [board, target, authority, { ...unrelated, data: { ...unrelated.data, prompt: 'Unrelated B' } }, unrelatedTarget], graphEdges)).toBe(base)
    expect(videoPromptCompileFingerprint(target, [board, target, { ...authority, data: { ...authority.data, prompt: 'Dry platform.' } }, unrelated, unrelatedTarget], graphEdges)).not.toBe(base)
    expect(videoPromptCompileFingerprint(target, [board, target, authority, unrelated, unrelatedTarget], graphEdges.map((item) => item.id === 'authority-edge' ? { ...item, data: { inputFidelity: 'lock' } } : item))).not.toBe(base)
  })

  it('fingerprints authoritative compiler inputs and ignores layout/runtime presentation', () => {
    const base = videoPromptCompileFingerprint(video(), [storyboard(), video()], [edge])
    expect(videoPromptCompileFingerprint(video({ runState: 'running', progress: 'Generating' }), [{ ...storyboard(), position: { x: 999, y: 999 }, selected: true }, video()], [edge])).toBe(base)
    expect(videoPromptCompileFingerprint(video(), [storyboard('Changed action.'), video()], [edge])).not.toBe(base)
    expect(videoPromptCompileFingerprint(video(), [storyboard(), video()], [{ ...edge, data: { inputFidelity: 'lock' } }])).not.toBe(base)
    const media: StudioNode = { id: 'media', type: 'studio', position: { x: 0, y: 0 }, data: { kind: 'upload', title: 'Media', generatedResults: [{ path: '/a.png', url: 'a', type: 'image', modelId: 'm', createdAt: 'v1' }], activeResultIndex: 0 } }
    const mediaEdge: Edge = { id: 'media-edge', source: media.id, target: 'video', targetHandle: 'reference-in' }
    const mediaBase = videoPromptCompileFingerprint(video(), [video(), media], [mediaEdge])
    expect(videoPromptCompileFingerprint(video(), [video(), { ...media, data: { ...media.data, generatedResults: [{ path: '/b.png', url: 'b', type: 'image', modelId: 'm', createdAt: 'v2' }] } }], [mediaEdge])).not.toBe(mediaBase)
    expect(videoPromptCompileFingerprint(video(), [video(), { ...media, data: { ...media.data, progress: 'noise', runState: 'running' } }], [mediaEdge])).toBe(mediaBase)
  })
})
