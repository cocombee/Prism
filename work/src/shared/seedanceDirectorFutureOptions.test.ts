import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { GenerationRequest, StoryboardPanel } from './types'
import { providerPromptPreviewCompilation, providerSeedancePayloadCompilation } from './referenceInstructions'
import { storyboardDirectorBaselinePolicy, storyboardRewriteInstruction } from './storyboardRewrite'
import { validateDirectorKnowledgeIds } from './seedanceDirectorContract'
import {
  DIRECTOR_FUTURE_KNOWLEDGE_AUTHORITY,
  futureDirectorOptions,
  isFutureOptionExecutable,
} from './seedanceDirectorFutureOptions'

const expectedInventory = [
  ['SD-FUTURE-001', 'per-shot-lens-optical-character', 'canonical-deferred', ['SD-AB-008'], []],
  ['SD-FUTURE-002', 'focus-depth-focal-plane-behavior', 'canonical-deferred', ['SD-AB-009'], []],
  ['SD-FUTURE-003', 'camera-angle-height-side-match-constraints', 'canonical-deferred', ['SD-AB-007', 'SD-AB-011'], []],
  ['SD-FUTURE-004', 'authored-lighting-grade-atmosphere-transition-state', 'canonical-deferred', ['SD-AB-019', 'SD-AB-020', 'SD-AB-021', 'SD-AB-022'], []],
  ['SD-FUTURE-005', 'advanced-dialogue-lipsync-audio-mix', 'canonical-deferred', ['SD-AB-018', 'SD-PS-010'], []],
  ['SD-FUTURE-006', 'concealed-discrete-state-change-pattern', 'canonical-deferred', ['SD-PS-009', 'SD-AB-012'], []],
  ['SD-FUTURE-007', 'provider-capability-snapshot-gating', 'canonical-deferred', ['SD-AB-023'], []],
  ['SD-FUTURE-008', 'fixed-source-lighting-transition-path-feasibility', 'provisional-disabled', [], ['CK-R23']],
  ['SD-FUTURE-009', 'slow-motion-capture-playback-time-basis', 'provisional-disabled', [], ['CK-R21']],
  ['SD-FUTURE-010', 'particle-wind-material-classes', 'provisional-disabled', [], ['CK-R20']],
  ['SD-FUTURE-011', 'anatomical-laterality-view-transforms', 'provisional-disabled', [], ['CK-R19']],
  ['SD-FUTURE-012', 'residue-material-transfer', 'provisional-disabled', [], ['CK-R24']],
  ['SD-FUTURE-013', 'production-zones', 'provisional-disabled', [], ['CK-R14']],
  ['SD-FUTURE-014', 'background-stillness', 'provisional-disabled', [], ['CK-R26']],
  ['SD-FUTURE-015', 'terminal-perceptual-quiet', 'provisional-disabled', [], ['CK-R27']],
] as const

const request: GenerationRequest = {
  nodeId: 'future-contract-test',
  kind: 'video-generator',
  prompt: '@hero crosses the sodium-lit hall.',
  authoredPrompt: '@hero crosses the sodium-lit hall.',
  stylePrompt: 'Authored silver-blue grade.',
  videoEngine: 'bytedance/seedance-2.5/reference-to-video',
  references: [{ role: 'character', tag: '@hero', path: '/hero.png', mediaType: 'image', slot: 'reference' }],
  storyboardShots: [{ prompt: '@hero crosses the sodium-lit hall.', duration: 4, shotSize: 'wide', camera: 'static' }],
}

function sourceFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : [path]
  })
}

describe('hidden Seedance Director future option knowledge', () => {
  it('preserves the complete stable branch-separated inventory and authority hashes', () => {
    const options = futureDirectorOptions()
    expect(options.map((option) => [option.id, option.domain, option.status, option.canonicalOverlapIds, option.provisionalEvidenceIds])).toEqual(expectedInventory)
    expect(DIRECTOR_FUTURE_KNOWLEDGE_AUTHORITY).toEqual({
      canonicalSkillHash: 'e8ae06cdb80008e4515ef7b75cb009c2df3677be0e8f6203629ec23fb4bee0e6',
      promotionReadinessHash: '85c3d3522a78df6212a3d484e2d535fc34908f4174ca96e285011dd8183543a1',
      proseAuthority: 'Seedance skill and Director plan',
      unlistedProvisionalEvidence: 'accounted-in-director-plan-only',
    })
    for (const option of options) {
      expect(option.unavailableReason.length).toBeGreaterThan(0)
      expect(option.promotionGate.length).toBeGreaterThan(0)
      expect(Object.isFrozen(option)).toBe(true)
      expect(Object.isFrozen(option.canonicalOverlapIds)).toBe(true)
      expect(Object.isFrozen(option.provisionalEvidenceIds)).toBe(true)
      if (option.status === 'canonical-deferred') {
        expect(option.canonicalOverlapIds.length).toBeGreaterThan(0)
        expect(option.provisionalEvidenceIds).toEqual([])
        expect(validateDirectorKnowledgeIds(option.canonicalOverlapIds)).toEqual({ ok: true })
      } else {
        expect(option.canonicalOverlapIds).toEqual([])
        expect(option.provisionalEvidenceIds.length).toBeGreaterThan(0)
      }
    }
  })

  it('keeps every future option hidden and non-executable while canonical validation rejects CK evidence IDs', () => {
    const options = futureDirectorOptions()
    expect(Object.isFrozen(options)).toBe(true)
    for (const option of options) {
      expect(option.visible).toBe(false)
      expect(option.executable).toBe(false)
      expect(isFutureOptionExecutable(option.id)).toBe(false)
      for (const evidenceId of option.provisionalEvidenceIds) {
        expect(validateDirectorKnowledgeIds([evidenceId])).toEqual({ ok: false, invalidIds: [evidenceId] })
      }
    }
    expect(isFutureOptionExecutable('unknown-future-option')).toBe(false)
  })

  it('does not leak CK evidence into completion, Revamp, rendered prompts, or provider transport and preserves authored priority', () => {
    const preview = providerPromptPreviewCompilation(request).text
    const payload = providerSeedancePayloadCompilation(request).text
    const revampPanels: StoryboardPanel[] = [{ id: 'one', prompt: '@hero crosses the sodium-lit hall.', duration: 4, shotSize: 'wide', camera: 'static' }]
    const revamp = storyboardRewriteInstruction(revampPanels, 'one')
    const baseline = storyboardDirectorBaselinePolicy()
    for (const text of [preview, payload, revamp, baseline]) expect(text).not.toMatch(/CK-[RI]\d+/)
    expect(preview.match(/Authored silver-blue grade\./g)).toHaveLength(1)
    expect(payload.match(/Authored silver-blue grade\./g)).toHaveLength(1)

    const authoredOverride = 'User-owned exact provider body.'
    const overrideRequest = { ...request, providerPromptOverride: authoredOverride }
    expect(providerPromptPreviewCompilation(overrideRequest).text).toBe(authoredOverride)
    expect(providerSeedancePayloadCompilation(overrideRequest).text).toBe(authoredOverride)
  })

  it('has no UI, renderer, main, preload, or prompt-runtime import', () => {
    const roots = ['renderer', 'main', 'preload'].map((directory) => fileURLToPath(new URL(`../${directory}/`, import.meta.url)))
    const runtimeFiles = [
      fileURLToPath(new URL('./referenceInstructions.ts', import.meta.url)),
      fileURLToPath(new URL('./shotSpec.ts', import.meta.url)),
      fileURLToPath(new URL('./seedanceDirectorValidation.ts', import.meta.url)),
      fileURLToPath(new URL('./storyboardRewrite.ts', import.meta.url)),
    ]
    const wiredSources = [...roots.flatMap(sourceFiles), ...runtimeFiles]
      .filter((path) => /\.(?:ts|tsx)$/.test(path) && !path.endsWith('.test.ts') && !path.endsWith('.test.tsx'))
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n')
    expect(wiredSources).not.toMatch(/seedanceDirectorFutureOptions|futureDirectorOptions|isFutureOptionExecutable/)
  })
})
