import type { SeedanceDirectorKnowledgeId } from './seedanceDirectorContract'

export type FutureDirectorOptionStatus = 'canonical-deferred' | 'provisional-disabled'
export type FutureDirectorOptionId = `SD-FUTURE-${string}`
export type ProvisionalDirectorEvidenceId = `CK-R${number}` | `CK-I${number}`

export interface FutureDirectorOption {
  readonly id: FutureDirectorOptionId
  readonly domain: string
  readonly status: FutureDirectorOptionStatus
  readonly executable: false
  readonly visible: false
  readonly canonicalOverlapIds: readonly SeedanceDirectorKnowledgeId[]
  readonly provisionalEvidenceIds: readonly ProvisionalDirectorEvidenceId[]
  readonly unavailableReason: string
  readonly promotionGate: string
}

export const DIRECTOR_FUTURE_KNOWLEDGE_AUTHORITY = Object.freeze({
  canonicalSkillHash: 'e8ae06cdb80008e4515ef7b75cb009c2df3677be0e8f6203629ec23fb4bee0e6',
  promotionReadinessHash: '85c3d3522a78df6212a3d484e2d535fc34908f4174ca96e285011dd8183543a1',
  proseAuthority: 'Seedance skill and Director plan',
  unlistedProvisionalEvidence: 'accounted-in-director-plan-only',
} as const)

const canonical = (
  id: FutureDirectorOptionId,
  domain: string,
  canonicalOverlapIds: readonly SeedanceDirectorKnowledgeId[],
  unavailableReason: string,
  promotionGate: string,
): FutureDirectorOption => Object.freeze({
  id, domain, status: 'canonical-deferred', executable: false, visible: false,
  canonicalOverlapIds: Object.freeze([...canonicalOverlapIds]),
  provisionalEvidenceIds: Object.freeze([]), unavailableReason, promotionGate,
})

const provisional = (
  id: FutureDirectorOptionId,
  domain: string,
  provisionalEvidenceIds: readonly ProvisionalDirectorEvidenceId[],
  unavailableReason: string,
  promotionGate: string,
): FutureDirectorOption => Object.freeze({
  id, domain, status: 'provisional-disabled', executable: false, visible: false,
  canonicalOverlapIds: Object.freeze([]),
  provisionalEvidenceIds: Object.freeze([...provisionalEvidenceIds]), unavailableReason, promotionGate,
})

const FUTURE_DIRECTOR_OPTIONS = Object.freeze([
  canonical('SD-FUTURE-001', 'per-shot-lens-optical-character', ['SD-AB-008'], 'No complete typed per-shot optical control exists.', 'Promote only after typed controls, authored ownership, compiler mapping, provider capability validation, and regression tests are complete.'),
  canonical('SD-FUTURE-002', 'focus-depth-focal-plane-behavior', ['SD-AB-009'], 'Focus and focal-plane state are not represented end to end.', 'Promote only after typed focus state, deterministic compilation, provider support checks, and continuity tests exist.'),
  canonical('SD-FUTURE-003', 'camera-angle-height-side-match-constraints', ['SD-AB-007', 'SD-AB-011'], 'Current camera metadata cannot express the full matched spatial constraint.', 'Promote only after typed angle/height/side and match state survive authoring, compilation, persistence, and validation.'),
  canonical('SD-FUTURE-004', 'authored-lighting-grade-atmosphere-transition-state', ['SD-AB-019', 'SD-AB-020', 'SD-AB-021', 'SD-AB-022'], 'Authored transition state has no complete typed product contract.', 'Promote only after explicit authored state, precedence, continuity, provider capability, and round-trip tests are approved.'),
  canonical('SD-FUTURE-005', 'advanced-dialogue-lipsync-audio-mix', ['SD-AB-018', 'SD-PS-010'], 'Advanced speech synchronization and mix controls are unavailable.', 'Promote only after typed dialogue/audio ownership, timing, capability validation, transport mapping, and acceptance tests exist.'),
  canonical('SD-FUTURE-006', 'concealed-discrete-state-change-pattern', ['SD-PS-009', 'SD-AB-012'], 'No safe typed authoring and validation path exists for concealed state changes.', 'Promote only after explicit before/cover/after state, cut ownership, continuity validation, and provider-safe tests exist.'),
  canonical('SD-FUTURE-007', 'provider-capability-snapshot-gating', ['SD-AB-023'], 'Verified provider capability snapshots are not an executable Director input.', 'Promote only after authenticated versioned capability snapshots block unsupported compilation before transport and have stale-state tests.'),
  provisional('SD-FUTURE-008', 'fixed-source-lighting-transition-path-feasibility', ['CK-R23'], 'Evidence is provisional and fixed-source path feasibility is unverified.', 'Promote only through the Director plan after reproducible evidence, canonical review, typed design, and provider validation.'),
  provisional('SD-FUTURE-009', 'slow-motion-capture-playback-time-basis', ['CK-R21'], 'Capture and playback time basis remains evidence-only.', 'Promote only after canonical approval plus explicit typed time bases and end-to-end timing tests.'),
  provisional('SD-FUTURE-010', 'particle-wind-material-classes', ['CK-R20'], 'Material response classes remain evidence-only.', 'Promote only after canonical approval, bounded material taxonomy, provider support, and physics regression tests.'),
  provisional('SD-FUTURE-011', 'anatomical-laterality-view-transforms', ['CK-R19'], 'Laterality transform evidence is not canonical or executable.', 'Promote only after canonical approval, typed view transforms, identity safeguards, and mirrored-view tests.'),
  provisional('SD-FUTURE-012', 'residue-material-transfer', ['CK-R24'], 'Transfer-state evidence is not canonical or represented.', 'Promote only after canonical approval, typed source/target state, continuity rules, and material-transfer tests.'),
  provisional('SD-FUTURE-013', 'production-zones', ['CK-R14'], 'Production-zone evidence has no approved product semantics.', 'Promote only after canonical approval, typed zone ownership, conflict precedence, and compiler tests.'),
  provisional('SD-FUTURE-014', 'background-stillness', ['CK-R26'], 'Background stillness remains an unvalidated evidence pattern.', 'Promote only after canonical approval, measurable scope, provider validation, and motion-isolation tests.'),
  provisional('SD-FUTURE-015', 'terminal-perceptual-quiet', ['CK-R27'], 'Terminal perceptual quiet remains an unvalidated evidence pattern.', 'Promote only after canonical approval, typed endpoint semantics, provider validation, and final-state tests.'),
] satisfies readonly FutureDirectorOption[])

/** Hidden read-only planning inventory. It is intentionally not part of prompt or provider runtime. */
export function futureDirectorOptions(): readonly FutureDirectorOption[] {
  return FUTURE_DIRECTOR_OPTIONS
}

/** Future options cannot execute until a separately reviewed promotion changes the contract. */
export function isFutureOptionExecutable(_id: string): false {
  return false
}
