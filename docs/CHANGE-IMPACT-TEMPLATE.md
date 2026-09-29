# Prism Change Impact — Seedance Current Contract Prism-Only Pass (2026-08-28)

> **Status:** Prism-only implementation, package, and exact-path launch complete; full Vitest retains documented unrelated failures and startup catalog networking was observed despite no user action.

## Last verified checkpoint
- Checkpoint ID: current promoted source described by `status/CURRENT.md` (2026-08-26), with immutable rollback parent `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/`.
- Last verified source evidence: source parity 302/302; manifest `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`; promoted `app.asar` `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Passing verification at that checkpoint: 141/141 Vitest files, 1,038/1,038 tests; TypeScript and production build passed.
- Current-tree caveat: interrupted predecessor edits already exist in `types.ts`, `workflowResolver.ts`, and `workflowResolver.test.ts`; retain only behavior proved by the combined brief and current tests. Unrelated later renderer/offline/readiness edits are preserved and excluded.
- Surgical pre-change rollback: `/tmp/prism-seedance-typed-continuity-prechange-20260827.tgz` SHA-256 `c8eb28972262684be1e888660b4384d4678e35a1e74961406394de668d5d0e94`; file manifest `/tmp/prism-seedance-typed-continuity-prechange-manifest-20260827.json` SHA-256 `400162de4ca67fd35e6a2aceed5462532680d4f4787e09891f20aed230f482ca`.
- Reference-exclusive pre-change rollback: `/tmp/prism-seedance-reference-exclusive-prechange-20260828.tgz`; manifest `/tmp/prism-seedance-reference-exclusive-prechange-manifest-20260828.json`.

## Scope
- In scope: prior reference-exclusive authority; current-shot provider-visible projection with future typed ledger and active off-camera continuity; provider-neutral explicit single-state-authority readiness; Continue/Cut, Revamp, budgeting, final `NEGATIVE PROMPT`, and cross-surface parity; Seedance v1.1.11 provenance; canonical Storyboard/provider documentation.
- Out of scope: OpenArt/manual lowercase `@imageN` lexical validation; Bare Prompt/manual workflow defaults; Prism semantic-tag parser/autocomplete/highlighting/validation or adapter behavior changes; UI/design, Library, selectors, red-wire/shared controls; provider/model network discovery; provider execution; media generation; credentials; real user data; live UI inspection.
- Reference-exclusive scope: additive optional `visualAuthorityMode` plus one named `authoredAppearanceDelta`; exact physically connected Character/Wardrobe/Element/Location visuals default to `reference-exclusive`, while absent visual connections stay `text-described`. Metadata descriptions never become deltas or provider-visible appearance prose. Existing projects load unchanged with no schema bump or migration.
- Files allowed to change:
  - `work/src/shared/types.ts`
  - `work/src/shared/shotSpec.ts`, `shotSpec.test.ts`
  - `work/src/shared/workflowResolver.ts`, `workflowResolver.test.ts`
  - `work/src/shared/seedanceDirectorContract.ts`, `seedanceDirectorContract.test.ts`
  - `work/src/shared/seedanceDirectorValidation.ts`, `seedanceDirectorValidation.test.ts`
  - `work/src/shared/storyboardRewrite.ts`, `storyboardRewrite.test.ts`
  - `work/src/shared/referenceInstructions.ts`, `providerPromptBody.test.ts`
  - directly required renderer wiring/tests only because focused RED proved the owning Revamp seam: `work/src/renderer/src/AppNext.tsx`, `productSurface.test.ts`
  - this impact map and `docs/features/nodes/workflow/storyboard/provider-shot-contract.md`, `regression-matrix.md`, `storyboard-node.md`.
- Explicitly protected: `App.tsx`, `NodeCard.tsx`, `styles.css`, `main.tsx`, `index.html`, package configuration, Library and semantic-selector work. No visible UI markup or styling changes are authorized.

## Dependencies
- Feature/node: Storyboard panel compilation and Video Generator Locked/User ownership.
- Architecture/runtime boundary: shared request schema → resolver → canonical semantic prompt → provider adapter.
- API/provider: exact semantic body is compiled before adapter-only ordinal translation; selected-model configured limits only; no live capability query.
- Authentication/authorization: unchanged; no credential access.
- Contract/schema: additive optional fields only. Existing `incoming`, `outgoing`, and `held` arrays remain valid. No schema-version bump and no destructive migration.
- Persistence/data: existing projects load without typed fields; typed fields, when present, are authoritative and are never reconstructed from action prose.
- Design: none; preserve current UI and current Locked/User labels/behavior.
- Tests/release: strict vertical RED→GREEN; focused resolver/ledger/prompt/validation/rewrite/provenance tests; affected Storyboard/provider contracts; TypeScript; build; one full Vitest run; one signing-disabled thin arm64 package and launch handoff.

## Provider-visible and rewrite boundaries
- One typed provider-neutral semantic master owns deterministic completion, visible/saved Composed Prompt, Storyboard→Video request data, and exact provider-bound semantic body.
- Edited shots inherit complete active-group Character state, apply typed deltas only, and emit compact state lines independently of prose tag scanning.
- Sequence-global invariants emit once; point-of-use references and boundary records remain scoped; no repeated universal preservation paragraph.
- Explicit exclusions win across references, visible prose, Revamp manifests, and provider semantic body.
- Revamp Shot receives whole-sequence read-only context and may mutate only its target; Revamp All stays one ordered atomic batch. Typed-state parity is validated before apply.
- Budgeting measures the exact semantic prompt against an existing configured selected-model limit where available. Safe deterministic deduplication/compression precedes a blocking diagnostic; no truncation or continuity-state deletion.

## Protected behavior
- Manual/User prompt bodies remain byte-exact and independent. First User seed and Reset behavior remain unchanged.
- Complete structured masters remain byte-exact no-ops; partial structured masters receive missing structure/state only.
- Continuous-take mode receives no synthetic hard cuts, shot boundaries, or repeated boundary boilerplate.
- Semantic `@tags` remain visible/saved; provider ordinals remain adapter-only and never enter the semantic master or Revamp context.
- Every complete Seedance projection ends with final section `NEGATIVE PROMPT`; `HARD CONSTRAINTS` never replaces or follows it.
- Authored action, dialogue, camera, timing, shot order, and unknown continuity fields are never fabricated or overwritten.
- Current UI, renderer, Library, semantic selectors, and unrelated concurrent edits remain unchanged.
- Sibling nodes/surfaces at risk: generic provider prompt compilation, non-Seedance families, Manual/User ownership, continuous Storyboards, Revamp atomic apply, and adapter mapping; all receive regression coverage where touched.

## Canonical authority decision
- Canonical Director behavior is covered by existing IDs: edited format/arithmetic `SD-PS-003`, `SD-PS-004`; continuous take `SD-PS-005`; point-of-use references `SD-PS-007`; continuity placement/state repetition `SD-PS-008`; dialogue/audio placement `SD-PS-010`; semantic/transport separation `SD-PS-012`; identity/wardrobe/prop locking `SD-AB-002`; hard-cut coverage `SD-AB-010`; match continuity anchors `SD-AB-011`; state/prop continuity and world-space blocking `SD-AB-015`; dialogue/audio/timing attributes where applicable (`SD-AB-017`, `SD-AB-018`, `SD-AB-021`, `SD-AB-023`).
- Prism-local typed extension: the optional field names, visibility enum, continuity-group membership/exclusions, per-boundary delta representation, typed state-authority phases plus exact required/available-state and view inventories, dialogue-span record, deterministic inheritance ledger/current-shot projection, budget diagnostic shape, and parity checks. These are explicitly Prism-local representations and are not assigned invented Director IDs.
- Seedance Director provenance is `1.1.11`, SHA-256 `3d269a485e793854cedcfa404d9b41526db02181b0281754c1132341006f6203`. Prompt Revision and Asset Binding `1.1.5` (`a46a3d48366625bd02359e597e25e37e105f85384aae52bc0acae710d75f939f`) and Deterministic Prompt Compilation `0.1.4` (`a2ece7f2ece633a948366ca844305ea9cfdcce3b6c07d90ff2ae10aa4487d961`) are implementation guidance/evidence only, not Seedance Director provenance.
- Reference-exclusive authority remains bound only to promoted IDs `SD-AB-001`, `SD-AB-002`, `SD-PS-007`, `SD-PS-008`, and `SD-PS-004`. The historical extraction fingerprint remains immutable. Manual/OpenArt ordinal rules and Bare Prompt are excluded from Prism runtime.

## Migration and rollback
- Data/schema change: additive optional fields only; no destructive project migration.
- Backup/restore proof: pre-change archive and SHA-256 manifest above; immutable promoted rollback parent remains untouched.
- Surgical rollback set: restore only files listed under “Files allowed to change” from the pre-change archive, rerun focused tests/typecheck/build, and preserve all unrelated current-tree edits.

## Verification
- Targeted tests: realistic seven-shot restaurant semantic-master fixture; typed ledger inheritance/deltas; exact provider-visible state lines; exclusions; state authority; dialogue span; six cuts/final negative; unknown omission; continuous mode; legacy/Manual no-op; resolver propagation; validation; Revamp parity/atomicity; model-budget pass/compress/block; provenance hash.
- Cross-boundary regression tests: Locked/Auto ↔ Composed Prompt; Storyboard request/autofill; provider semantic body before ordinals; Revamp Shot/All; adapter-only translation; existing Storyboard/provider contracts.
- Typecheck/build: `npm run typecheck`; `npm run build`; then one full `npm test -- --run` after focused green.
- Physical UI/provider/release checks: no UI inspection or clicks; no provider calls. Package one signing-disabled arm64 Flight Tester at `/tmp/prism-seedance-current-contract-prism-only-tester-20260827/mac-arm64/Prism Flight Tester.app`, verify ASAR/out parity, architecture, protected legacy hashes and zero provider/credential/media activity; only then gracefully quit the running Flight Tester, verify exit, open the candidate once, verify exact executable path, and stop for user acceptance.

## Final gate evidence
- Strict TDD: the exact-state conflict fixture failed first because submission did not block, then passed after the optional provider-neutral `requiredState`/`availableStates`/`referenceViews` contract and deterministic readiness diagnostic. Seedance provenance fixtures failed at 1.1.10 and passed after the atomic 1.1.11/hash update. Existing current-shot/off-camera/future-ledger and atomic Revamp regressions were green and retained. Negative-scope Prism semantic-tag punctuation tests passed without production parser/adapter changes.
- Final affected Prism scope passed 171/171 tests across 12 shared test files including documentation routing. The combined focused command was 307/312 because `productSurface.test.ts` retained five unrelated stale renderer source-string failures; none were weakened.
- TypeScript `tsc --noEmit` and the production Electron/Vite build passed.
- Full Vitest ran once: 177 files, 1,212/1,223 tests passed. Eleven unrelated current-tree failures remain: two reusable asset-generation prompt-boundary failures and nine stale renderer/source-contract expectations across `productSurface`, `semanticPostGenerationOverlay`, `storyboardHoverCanvasGrab`, and `successorSurface`.
- Signing-disabled thin arm64 package: `/tmp/prism-seedance-current-contract-prism-only-tester-20260827/mac-arm64/Prism Flight Tester.app`; builder signing was disabled, then a local ad-hoc signature was applied for launch (`TeamIdentifier` not set; deep/strict verification passed). ASAR SHA-256 `1971d642465de6fb0c09470c786a0f4e9d7fde0ed111f9b902983c6762ee79d9`; executable SHA-256 `95b32a8822fd42896ab6cc12d9e04275847078f066f1a179a0b3d3fa803efba9`; ASAR/out parity 25/25 with zero missing/extra/hash mismatches; Mach-O thin arm64.
- Protected legacy hashes remained exact: `App.tsx` `7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2`; `NodeCard.tsx` `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`; `styles.css` `d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27`.
- The retained 1.1.9/reference-exclusive tester at `/tmp/prism-seedance-reference-exclusive-authority-tester-20260827/mac-arm64/Prism Flight Tester.app` remained physically preserved. Its PID 74418 exited gracefully. The current candidate is running at PID 85496 from `/private/tmp/prism-seedance-current-contract-prism-only-tester-20260827/mac-arm64/Prism Flight Tester.app/Contents/MacOS/Prism Flight Tester`; no UI inspection occurred.
- No Run/Rerun, provider submission, paid inference, credential access, or media generation occurred. However, exact-path launch initiated automatic external startup catalog connections without user action; therefore a literal zero-network/API claim is not made. The first network-denied sandbox launch failed before opening because Electron child sandbox initialization was not permitted; the succeeding exact-path launch was not blind-retried and is the sole running candidate.
