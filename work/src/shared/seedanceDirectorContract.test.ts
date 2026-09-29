import { describe, expect, it } from 'vitest'
import {
  SEEDANCE_DIRECTOR_CONTRACT,
  SEEDANCE_DIRECTOR_SOURCE_HASH,
  SEEDANCE_DIRECTOR_SOURCE_VERSION,
  SEEDANCE_REFERENCE_EXCLUSIVE_IDS,
  canonicalDirectorKnowledgeIds,
  validateDirectorKnowledgeIds,
} from './seedanceDirectorContract'
import { seedanceShotSpecSections } from './shotSpec'

describe('canonical Seedance Director machine contract', () => {
  it('exposes the exact branch-separated 12 Prompt Structure and 25 Attribute Breakdown records', () => {
    expect(SEEDANCE_DIRECTOR_SOURCE_VERSION).toBe('1.1.14')
    expect(SEEDANCE_DIRECTOR_SOURCE_HASH).toBe('1885768f1efa5fe35a3ff4b3f17d37afe846ce05e6bafa9c1f377b566cb98eb1')
    expect(SEEDANCE_DIRECTOR_CONTRACT.promptStructureIds).toEqual(
      Array.from({ length: 12 }, (_, index) => `SD-PS-${String(index + 1).padStart(3, '0')}`),
    )
    expect(SEEDANCE_DIRECTOR_CONTRACT.attributeBreakdownIds).toEqual(
      Array.from({ length: 25 }, (_, index) => `SD-AB-${String(index + 1).padStart(3, '0')}`),
    )
    expect(canonicalDirectorKnowledgeIds()).toHaveLength(37)
    expect(JSON.stringify(SEEDANCE_DIRECTOR_CONTRACT)).not.toMatch(/CK-[RI]\d+/)
    expect(SEEDANCE_REFERENCE_EXCLUSIVE_IDS).toEqual(['SD-AB-001', 'SD-AB-002', 'SD-PS-007', 'SD-PS-008'])
    expect(SEEDANCE_DIRECTOR_CONTRACT.historicalExtractionFingerprint).toBe('15a0d2b7aa158198d02c4ab8673cc4d4aa9cd42146f15fd991daab8858c63d59')
  })

  it('accepts canonical provenance and rejects provisional or unknown executable knowledge', () => {
    expect(validateDirectorKnowledgeIds(['SD-PS-001', 'SD-AB-025'])).toEqual({ ok: true })
    expect(validateDirectorKnowledgeIds(['CK-R01'])).toMatchObject({ ok: false })
    expect(validateDirectorKnowledgeIds(['CK-I45'])).toMatchObject({ ok: false })
    expect(validateDirectorKnowledgeIds(['SD-AB-999'])).toMatchObject({ ok: false })
  })

  it('attaches canonical non-diagnostic knowledge provenance to every locally derived section', () => {
    const sections = seedanceShotSpecSections({
      nodeId: 'video', kind: 'video-generator', prompt: '', authoredPrompt: '',
      videoEngine: 'bytedance/seedance-2.5/reference-to-video',
      storyboardShots: [{ prompt: 'Authored action.', duration: 2, shotSize: 'wide', camera: 'static' }],
    })
    for (const section of sections) {
      expect(section.knowledgeIds?.length).toBeGreaterThan(0)
      expect(section.knowledgeIds).not.toContain('SD-AB-025')
      expect(section.knowledgeIds?.join(' ')).not.toMatch(/CK-[RI]\d/)
    }
  })
})
