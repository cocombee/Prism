# Change Impact — Storyboard Revamp All Coherent Batch — 2026-08-23

> **Status:** Active strict-TDD implementation from Designer-approved contract; no provider call, build, package, or UI action authorized.

## Scope
- Revamp Shot remains one paid assistant call for one editable panel.
- Revamp All becomes one paid assistant call containing all ordered panel context and returning a strict ordered JSON transport for all editable targets.
- Parse and validate every result before one atomic apply; failure applies none and has no per-panel fallback.
- Add caller-level in-flight exclusion, native button disablement, scoped `aria-busy`, and one atomic polite status lifecycle.
- Preserve duration-budget source and UI except shared Storyboard busy/status integration.

## Allowed files
- `work/src/shared/storyboardRewrite.ts`
- `work/src/shared/storyboardRewrite.test.ts`
- `work/src/renderer/src/AppNext.tsx`
- `work/src/renderer/src/UtilityNodes.tsx`
- `work/src/renderer/src/productSurface.test.ts`
- `docs/features/nodes/workflow/storyboard/storyboard-node.md`
- `skills/prism-foundry-product-standard/SKILL.md` after green
- this impact record.

## Protected contracts
- Existing assistant IPC signature remains unchanged.
- Panel IDs/order/count, prompts excluded as read-only, duration, shot size, camera, locks, Cut/Continue/final boundary, tags, dialogue, SHOT/BEAT/HARD CUT, connected context, continuity, and duration budgeting remain authoritative.
- Internal JSON, IDs, manifest syntax, parser details, provider/model names, and per-panel progress never enter visible prompts or status.
- Dirty state changes only after a valid atomic result changes one or more prompts.

## Verification
- RED→GREEN pure classification/instruction/parser/atomic validation tests.
- RED→GREEN active caller/product-surface one-call, busy, accessibility, and exact-copy contracts.
- Focused Revamp/batch/product plus directly affected duration tests and TypeScript only.
- Stable SHA-256 pre-build manifest at `/tmp/prism-storyboard-duration-revampall-prebuild-snapshot.json`.
- Build/package/open, inference, catalog refresh, live UI, and broad suite remain deferred.
