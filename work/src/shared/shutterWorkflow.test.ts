import { describe, expect, it } from 'vitest'
import type { StudioNode } from './types'
import { buildGenerationRequest } from './workflowResolver'
import { migrateUnifiedStoryboards } from './storyboardMigration'
import { videoPromptCompileFingerprint } from './videoPromptMode'

const video = (data: Partial<StudioNode['data']> = {}): StudioNode => ({
  id: 'video', type: 'studio', position: { x: 0, y: 0 },
  data: { kind: 'video-generator', title: 'Video', prompt: 'A runner crosses frame.', videoEngine: 'bytedance/seedance-2.5/text-to-video', motionCadence: 24, ...data },
})

describe('shutter workflow propagation and persistence', () => {
  it('carries canonical angle and display mode into generation requests and compile fingerprints', () => {
    const node = video({ shutterMode: 'speed', shutterAngle: 172.8 })
    const request = buildGenerationRequest(node, [node], [])
    expect(request).toMatchObject({ shutterMode: 'speed', shutterAngle: 172.8, motionCadence: 24 })
    expect(videoPromptCompileFingerprint(node, [node], [])).toContain('"shutterMode":"speed"')
    expect(videoPromptCompileFingerprint(node, [node], [])).toContain('"shutterAngle":172.8')
  })

  it('migrates legacy workflows and preserves existing shutter selections', () => {
    const legacy = { schemaVersion: 1 as const, id: 'w', name: 'W', createdAt: '', updatedAt: '', viewport: { x: 0, y: 0, zoom: 1 }, edges: [], nodes: [video()] }
    expect(migrateUnifiedStoryboards(legacy.nodes, legacy.edges).nodes[0].data).toMatchObject({ shutterMode: 'angle', shutterAngle: 180 })
    const current = { ...legacy, nodes: [video({ shutterMode: 'speed', shutterAngle: 144 })] }
    expect(migrateUnifiedStoryboards(current.nodes, current.edges).nodes[0].data).toMatchObject({ shutterMode: 'speed', shutterAngle: 144 })
  })
})
