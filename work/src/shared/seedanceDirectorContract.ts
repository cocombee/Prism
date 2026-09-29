export const SEEDANCE_DIRECTOR_SOURCE_VERSION = '1.1.14' as const
export const SEEDANCE_DIRECTOR_SOURCE_HASH = '1885768f1efa5fe35a3ff4b3f17d37afe846ce05e6bafa9c1f377b566cb98eb1' as const
export const SEEDANCE_HISTORICAL_EXTRACTION_FINGERPRINT = '15a0d2b7aa158198d02c4ab8673cc4d4aa9cd42146f15fd991daab8858c63d59' as const

export const SEEDANCE_PROMPT_STRUCTURE_IDS = [
  'SD-PS-001', 'SD-PS-002', 'SD-PS-003', 'SD-PS-004', 'SD-PS-005', 'SD-PS-006',
  'SD-PS-007', 'SD-PS-008', 'SD-PS-009', 'SD-PS-010', 'SD-PS-011', 'SD-PS-012',
] as const

export const SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS = [
  'SD-AB-001', 'SD-AB-002', 'SD-AB-003', 'SD-AB-004', 'SD-AB-005', 'SD-AB-006',
  'SD-AB-007', 'SD-AB-008', 'SD-AB-009', 'SD-AB-010', 'SD-AB-011', 'SD-AB-012',
  'SD-AB-013', 'SD-AB-014', 'SD-AB-015', 'SD-AB-016', 'SD-AB-017', 'SD-AB-018',
  'SD-AB-019', 'SD-AB-020', 'SD-AB-021', 'SD-AB-022', 'SD-AB-023', 'SD-AB-024',
  'SD-AB-025',
] as const

export type SeedancePromptStructureId = typeof SEEDANCE_PROMPT_STRUCTURE_IDS[number]
export type SeedanceAttributeBreakdownId = typeof SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS[number]
export type SeedanceDirectorKnowledgeId = SeedancePromptStructureId | SeedanceAttributeBreakdownId

/** Exact promoted authority for reference-exclusive visual projection; no other IDs are implied. */
export const SEEDANCE_REFERENCE_EXCLUSIVE_IDS = ['SD-AB-001', 'SD-AB-002', 'SD-PS-007', 'SD-PS-008'] as const satisfies readonly SeedanceDirectorKnowledgeId[]

export interface SeedanceDerivedProvenance {
  readonly kind: 'local-deterministic-completion' | 'local-validation' | 'revamp-hidden-policy'
  readonly knowledgeIds: readonly SeedanceDirectorKnowledgeId[]
  readonly sourceVersion: typeof SEEDANCE_DIRECTOR_SOURCE_VERSION
  readonly sourceHash: typeof SEEDANCE_DIRECTOR_SOURCE_HASH
  readonly providerCallAllowed: boolean
}

export const SEEDANCE_DIRECTOR_CONTRACT = Object.freeze({
  sourceVersion: SEEDANCE_DIRECTOR_SOURCE_VERSION,
  sourceHash: SEEDANCE_DIRECTOR_SOURCE_HASH,
  historicalExtractionFingerprint: SEEDANCE_HISTORICAL_EXTRACTION_FINGERPRINT,
  promptStructureIds: SEEDANCE_PROMPT_STRUCTURE_IDS,
  attributeBreakdownIds: SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS,
  completionPolicy: Object.freeze({
    mode: 'missing-only',
    manualOwnership: 'byte-exact',
    completeStructuredMaster: 'byte-exact',
    transportTokens: 'adapter-only',
    network: 'forbidden',
  }),
  prismLocalTypedRepresentation: Object.freeze([
    'continuity-group', 'active-cast', 'explicit-exclusions', 'character-state', 'character-state-delta',
    'state-authority-phase', 'state-authority-inventory', 'dialogue-span', 'prompt-budget-diagnostic', 'typed-parity-validation',
    'reference-exclusive-visual-authority', 'authored-appearance-delta', 'current-shot-projection-scope',
    'complete-dressed-body-authority', 'same-body-appearance-layer', 'appearance-owner-scope-selection',
    'referenced-prop-scale-authority',
  ]),
})

const CANONICAL_IDS = new Set<string>([...SEEDANCE_PROMPT_STRUCTURE_IDS, ...SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS])

export function canonicalDirectorKnowledgeIds(): readonly SeedanceDirectorKnowledgeId[] {
  return [...SEEDANCE_PROMPT_STRUCTURE_IDS, ...SEEDANCE_ATTRIBUTE_BREAKDOWN_IDS]
}

export function validateDirectorKnowledgeIds(ids: readonly string[]): { ok: true } | { ok: false; invalidIds: string[] } {
  const invalidIds = ids.filter((id) => !CANONICAL_IDS.has(id))
  return invalidIds.length ? { ok: false, invalidIds } : { ok: true }
}

export function directorProvenance(kind: SeedanceDerivedProvenance['kind'], knowledgeIds: readonly SeedanceDirectorKnowledgeId[]): SeedanceDerivedProvenance {
  const validated = validateDirectorKnowledgeIds(knowledgeIds)
  if (!validated.ok) throw new Error(`Non-canonical Director knowledge IDs: ${validated.invalidIds.join(', ')}`)
  return {
    kind,
    knowledgeIds: [...knowledgeIds],
    sourceVersion: SEEDANCE_DIRECTOR_SOURCE_VERSION,
    sourceHash: SEEDANCE_DIRECTOR_SOURCE_HASH,
    providerCallAllowed: kind === 'revamp-hidden-policy',
  }
}
