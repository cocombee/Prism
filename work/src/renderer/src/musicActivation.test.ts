import { describe, expect, it } from 'vitest'
import type { StudioNode, StudioNodeData } from '../../shared/types'
import { initialData, migrateRetiredProductNode, musicRecoveryOutputPatch } from './AppNext'
import { NODE_PALETTE } from './nodePalette'
import { audioGenerationLabel } from '../../shared/elevenLabsAudio'

const node = (data: StudioNodeData): StudioNode => ({ id: 'music-owner', type: 'studio', position: { x: 12, y: 24 }, data })
describe('explicit current Music activation', () => {
  it('creates a direct versioned node with separate empty families and a legal minimum prompt duration', () => {
    const data = initialData('music-generator')
    expect(data).toMatchObject({ kind: 'music-generator', title: 'Music', musicVersion: 1, audioProvider: 'elevenlabs', musicModelId: 'music_v2_5', musicGenerationMode: 'prompt', musicSeconds: '3', duration: 3, forceInstrumental: false, audioOutputFormat: 'auto', quantity: 1 })
    expect(data.musicPlanDrafts?.v1).toMatchObject({ positiveStyles: '', negativeStyles: '', respectDurations: true })
    expect(data.musicPlanDrafts?.v1.sections).toHaveLength(1)
    expect(data.musicPlanDrafts?.v2.sections).toHaveLength(1)
    expect(data.musicPlanDrafts?.v1.sections[0]).toMatchObject({ name: 'Verse', seconds: '3', lyrics: '', positiveStyles: '', negativeStyles: '' })
    expect(data.musicPlanDrafts?.v2.sections[0]).toMatchObject({ seconds: '3', lyrics: '', context: 'high' })
    const other = initialData('music-generator')
    expect(other.musicPlanDrafts).not.toBe(data.musicPlanDrafts)
    expect(other.musicPlanDrafts?.v1.sections).not.toBe(data.musicPlanDrafts?.v1.sections)
  })
  it('admits current versioned Music without mutating any saved authored field or media result', () => {
    const data = initialData('music-generator')
    data.prompt = '  Exact\r\n\r\nPulse  '
    data.musicPlanDrafts!.v2.sections[0].lyrics = '  Exact\r\n\r\nLyric  '
    data.outputPath = '/fictional/prior.mp3'
    const saved = node(data), before = structuredClone(saved)
    expect(migrateRetiredProductNode(saved)).toBe(saved)
    expect(saved).toEqual(before)
  })
  it.each([false, true])('keeps unversioned legacy Music retirement and authored/media preservation (output=%s)', output => {
    const saved = node({ kind: 'music-generator', title: 'Authored Legacy', prompt: '  Original\r\nline  ', ...(output ? { outputPath: '/fictional/original.mp3', outputType: 'audio' as const } : {}), duration: 30, forceInstrumental: true })
    const migrated = migrateRetiredProductNode(saved)
    expect(migrated.data.kind).toBe(output ? 'output' : 'prompt')
    expect(migrated.data.prompt).toBe(saved.data.prompt)
    expect(migrated.data.outputPath).toBe(saved.data.outputPath)
    expect(migrated.data.duration).toBe(30)
    expect(migrated.data.forceInstrumental).toBe(true)
    expect(saved.data.kind).toBe('music-generator')
  })
  it('keeps unrelated audio creation defaults and palette entries unchanged', () => {
    const voice = initialData('voiceover'), effects = initialData('sound-effects')
    expect(voice).toMatchObject({ voiceEngine: 'elevenlabs-direct', audioOutputFormat: 'mp3_44100_128' })
    expect(effects).toMatchObject({ audioProvider: 'elevenlabs', duration: 0.5, audioOutputFormat: 'mp3_44100_128' })
    expect(voice.musicVersion).toBeUndefined()
    expect(effects.musicVersion).toBeUndefined()
    expect(NODE_PALETTE.filter(entry => entry.kind === 'music-generator')).toHaveLength(1)
    expect(NODE_PALETTE.find(entry => entry.variant === 'voice-change')).toBeDefined()
  })
  it('labels versioned Music models without changing legacy or speech labels', () => {
    const data = initialData('music-generator')
    expect(audioGenerationLabel(data)).toBe('ElevenLabs Music v2.5')
    expect(audioGenerationLabel({ ...data, musicModelId: 'music_v1' })).toBe('ElevenLabs Music v1')
    expect(audioGenerationLabel({ ...data, musicVersion: undefined })).toBeUndefined()
    expect(audioGenerationLabel(initialData('sound-effects'))).toBe('ElevenLabs Sound Effects v2')
  })
})


describe('Music recovery adopts output into the latest authored data', () => {
  it('preserves concurrent lyrics/settings/CRLF and does not resurrect an older deleted result', () => {
    const live = initialData('music-generator')
    live.prompt = '  New author\r\nexact  '
    live.musicPlanDrafts!.v2.sections[0].lyrics = '  Edited during recovery\r\n\r\nline  '
    live.seed = 0
    live.generatedResults = [{ path: '/fictional/current.mp3', url: 'prism-asset://current', modelId: 'music_v2_5', type: 'audio' }]
    const recovered = { ...initialData('music-generator'), prompt: 'OLD', outputPath: '/fictional/recovered.mp3', outputUrl: 'prism-asset://recovered', outputType: 'audio' as const, modelId: 'music_v2_5', generatedResults: [{ path: '/fictional/deleted.mp3', url: 'prism-asset://deleted', modelId: 'music_v2_5', type: 'audio' as const }, { path: '/fictional/recovered.mp3', url: 'prism-asset://recovered', modelId: 'music_v2_5', type: 'audio' as const }] }
    const before = structuredClone(live), storedBefore = structuredClone(recovered)
    const patch = musicRecoveryOutputPatch(live, recovered), merged = { ...live, ...patch }
    expect(merged.prompt).toBe(live.prompt)
    expect(merged.musicPlanDrafts).toBe(live.musicPlanDrafts)
    expect(merged.seed).toBe(0)
    expect(merged.generatedResults?.map(item => item.path)).toEqual(['/fictional/current.mp3', '/fictional/recovered.mp3'])
    expect(merged).toMatchObject({ outputPath: '/fictional/recovered.mp3', outputType: 'audio', activeResultIndex: 1, runState: 'complete' })
    expect(Object.keys(patch).sort()).toEqual(['activeResultIndex','error','generatedResults','modelId','outputPath','outputType','outputUrl','progress','runStartedAt','runState'].sort())
    expect(live).toEqual(before)
    expect(recovered).toEqual(storedBefore)
    expect(musicRecoveryOutputPatch(merged, recovered).generatedResults).toHaveLength(2)
  })
  it('does not invent an output when the saved recovery has no verified projected audio', () => {
    expect(() => musicRecoveryOutputPatch(initialData('music-generator'), initialData('music-generator'))).toThrow(/unavailable/)
  })
})
