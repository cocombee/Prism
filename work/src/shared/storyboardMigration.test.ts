import { describe, expect, it } from 'vitest'
import type { Edge } from '@xyflow/react'
import type { StudioNode } from './types'
import { migrateUnifiedStoryboards } from './storyboardMigration'
import { resolveVideoModel } from './videoModels'

const node = (id: string, kind: StudioNode['data']['kind'], data: Partial<StudioNode['data']> = {}): StudioNode => ({
  id, type: kind === 'storyboard' ? 'storyboard' : kind === 'storyboard-asset' ? 'storyboard-asset' : 'studio', position: { x: 0, y: 0 }, data: { kind, title: id, ...data },
})

describe('migrateUnifiedStoryboards', () => {
  it('absorbs a compiled result, redirects its video edge, and removes the redundant edge', () => {
    const nodes = [
      node('creator', 'storyboard', { title: 'Launch Creator', storyboardPanels: [{ id: 'one', prompt: 'wide shot', duration: 3, locked: false }] }),
      node('result', 'storyboard-asset', { title: 'launch', storyboardSourceId: 'creator', outputPath: '/launch.png', referenceTag: '@launch' }),
      node('video', 'video-generator'),
    ]
    const edges: Edge[] = [
      { id: 'compile', source: 'creator', sourceHandle: 'storyboard-out', target: 'result', targetHandle: 'storyboard-in' },
      { id: 'deploy', source: 'result', sourceHandle: 'storyboard-out', target: 'video', targetHandle: 'storyboard-in' },
    ]
    const migrated = migrateUnifiedStoryboards(nodes, edges)
    expect(migrated.nodes.map((item) => item.id)).toEqual(['creator', 'video'])
    expect(migrated.nodes[0].data).toMatchObject({ title: 'launch', outputPath: '/launch.png', referenceTag: '@launch' })
    expect(migrated.edges).toEqual([{ ...edges[1], source: 'creator' }])
    expect(migrateUnifiedStoryboards(migrated.nodes, migrated.edges)).toEqual(migrated)
  })

  it('converts a legacy result-only node in place', () => {
    const migrated = migrateUnifiedStoryboards([node('result', 'storyboard-asset', { title: 'Storyboard Asset', outputPath: '/only.png' })], [])
    expect(migrated.nodes[0]).toMatchObject({ id: 'result', type: 'storyboard', data: { kind: 'storyboard', title: 'Storyboard', outputPath: '/only.png' } })
    expect(migrated.nodes[0].data.storyboardPanels).toEqual([
      { id: 'result-panel-1', prompt: '', duration: 1, shotSize: 'wide', camera: 'static', audioCue: '', locked: false },
      { id: 'result-panel-2', prompt: '', duration: 1, shotSize: 'wide', camera: 'static', audioCue: '', locked: false },
    ])
    expect(migrated.nodes[0].data).not.toHaveProperty('storyboardEditorOpen')
    expect(migrated.nodes[0].data).not.toHaveProperty('selectorDeployment')
    expect(migrateUnifiedStoryboards(migrated.nodes, migrated.edges)).toEqual(migrated)
  })

  it('materializes a formerly selected reusable Storyboard into an idempotent node-local editor payload', () => {
    const authoredPanels = [
      { id: 'panel-a', prompt: 'Original line one.\nOriginal line two.', originalPrompt: 'Original line one.\nOriginal line two.', revampedPrompt: 'Revamped line.', selectedPromptVersion: 'revamped' as const, duration: 2.5, shotSize: 'detail' as const, camera: 'dolly-down-slow', transitionToNext: 'continue' as const, locked: true, tags: ['@hero'] },
      { id: 'panel-b', prompt: 'Second panel.', duration: 1.5, shotSize: 'wide' as const, camera: 'static', locked: false },
    ]
    const legacySelection = node('selected-board', 'storyboard', {
      title: 'Selected reusable board', referenceTag: '@selected-board', outputPath: '/managed/storyboard.png', outputUrl: 'prism-asset://local/storyboard.png',
      referenceAssets: [{ id: 'compiled', name: 'storyboard.png', path: '/managed/storyboard.png', mimeType: 'image/png', origin: 'generated', createdAt: 'now' }],
      storyboardEditorOpen: false, selectorDeployment: true, storyboardPanels: authoredPanels, storyboardPanelCount: 2,
    })
    const other = node('unrelated', 'prompt', { prompt: 'Do not mutate me.' })
    const edge: Edge = { id: 'selected-video', source: legacySelection.id, sourceHandle: 'storyboard-out', target: other.id, targetHandle: 'text-in' }
    const migrated = migrateUnifiedStoryboards([legacySelection, other], [edge])
    expect(migrated.nodes[0]).toMatchObject({ id: legacySelection.id, position: legacySelection.position, data: {
      title: 'Selected reusable board', referenceTag: '@selected-board', outputPath: '/managed/storyboard.png', outputUrl: 'prism-asset://local/storyboard.png', storyboardPanels: authoredPanels,
    } })
    expect(migrated.nodes[0].data).not.toHaveProperty('storyboardEditorOpen')
    expect(migrated.nodes[0].data).not.toHaveProperty('selectorDeployment')
    expect(migrated.nodes[1]).toBe(other)
    expect(migrated.edges).toEqual([edge])
    expect(migrateUnifiedStoryboards(migrated.nodes, migrated.edges)).toEqual(migrated)
  })

  it('drops mistaken Storyboard image-layout fields without changing panels or compiled media', () => {
    const panels = [{ id: 'one', prompt: 'shot', duration: 1 }]
    const mistakenFields = { storyboardImageMode: 'single', storyboardImageAspectRatio: '9:16', aspectRatio: '9:16', imageResolution: '1K' } as Partial<StudioNode['data']> & Record<string, unknown>
    const migrated = migrateUnifiedStoryboards([
      node('creator', 'storyboard', { storyboardPanels: panels, ...mistakenFields }),
      node('result', 'storyboard-asset', { storyboardSourceId: 'creator', outputPath: '/sheet.png', ...mistakenFields }),
    ], [{ id: 'compile', source: 'creator', sourceHandle: 'storyboard-out', target: 'result', targetHandle: 'storyboard-in' }])
    expect(migrated.nodes[0].data.storyboardPanels).toEqual(panels)
    expect(migrated.nodes[0].data.outputPath).toBe('/sheet.png')
    expect(migrated.nodes[0].data).not.toHaveProperty('storyboardImageMode')
    expect(migrated.nodes[0].data).not.toHaveProperty('storyboardImageAspectRatio')
    expect(migrated.nodes[0].data).not.toHaveProperty('aspectRatio')
    expect(migrated.nodes[0].data).not.toHaveProperty('imageResolution')
  })

  it('migrates legacy Auto and numeric zero once to legal authored values without changing other panel bytes', () => {
    const modelId = 'bytedance/seedance-2.0/reference-to-video'
    const numericDurations = resolveVideoModel(modelId).durations.filter((value): value is number => typeof value === 'number')
    const target = Math.max(...numericDurations)
    const legacy = node('ordered', 'storyboard', {
      storyboardModelId: modelId,
      storyboardMode: 'single',
      storyboardDuration: target,
      storyboardPanels: [
        { id: 'auto', prompt: 'Legacy Auto prompt.', duration: 'auto' },
        { id: 'locked-zero', prompt: 'Locked exhausted prompt.', duration: 0, locked: true },
      ],
    })

    const firstOpen = migrateUnifiedStoryboards([legacy], [])
    const firstPanels = firstOpen.nodes[0].data.storyboardPanels || []
    expect(firstPanels.map((panel) => panel.duration)).toEqual([1, 0.5])
    expect(firstPanels[1]).toMatchObject({ id: 'locked-zero', prompt: 'Locked exhausted prompt.', locked: true })
    expect(firstOpen.nodes[0].data).not.toHaveProperty('storyboardDesiredDurations')

    const reopened = migrateUnifiedStoryboards(firstOpen.nodes, firstOpen.edges)
    expect(reopened).toEqual(firstOpen)
    expect(reopened.nodes[0].data.storyboardPanels?.map((panel) => panel.duration)).toEqual([1, 0.5])
  })

  it('migrates Video prompt modes without persisting compiled Auto text or transient errors', () => {
    const board = node('board', 'storyboard', { storyboardPanels: [{ id: 'p', prompt: 'Action.', duration: 4, shotSize: 'wide', camera: 'static' }] })
    const connected = node('connected', 'video-generator', { prompt: 'old manual', error: 'Panel 2 Continue conflict' })
    const manual = node('manual', 'video-generator', { prompt: 'preserve me' })
    const migrated = migrateUnifiedStoryboards([board, connected, manual], [{ id: 'story', source: board.id, target: connected.id, targetHandle: 'storyboard-in' }])
    expect(migrated.nodes.find((item) => item.id === connected.id)?.data).toMatchObject({ promptMode: 'auto', manualPromptDraft: 'old manual', manualPromptSeeded: true })
    expect(migrated.nodes.find((item) => item.id === connected.id)?.data).not.toHaveProperty('compiledStoryboardPrompt')
    expect(migrated.nodes.find((item) => item.id === connected.id)?.data.error).toBeUndefined()
    expect(migrated.nodes.find((item) => item.id === manual.id)?.data).toMatchObject({ promptMode: 'manual', manualPromptDraft: 'preserve me', manualPromptSeeded: true })
  })

  it('keeps newer authored panels and preserves stale compiled-sheet state', () => {
    const authoredPanels = [{ id: 'new-shot', prompt: 'new authored shot', duration: 3 }]
    const compiledPanels = [{ id: 'old-shot', prompt: 'old compiled shot', duration: 3 }]
    const migrated = migrateUnifiedStoryboards([
      node('creator', 'storyboard', { storyboardPanels: authoredPanels, storyboardDuration: 3, storyboardNeedsCompile: true }),
      node('result', 'storyboard-asset', { storyboardSourceId: 'creator', storyboardPanels: compiledPanels, storyboardDuration: 3, outputPath: '/old-sheet.png', outputUrl: 'prism-asset://local/old-sheet.png', outputType: 'image' }),
    ], [])

    expect(migrated.nodes).toHaveLength(1)
    expect(migrated.nodes[0].data.storyboardPanels).toEqual(authoredPanels)
    expect(migrated.nodes[0].data.storyboardNeedsCompile).toBe(true)
    expect(migrated.nodes[0].data.outputPath).toBe('/old-sheet.png')
  })
})
