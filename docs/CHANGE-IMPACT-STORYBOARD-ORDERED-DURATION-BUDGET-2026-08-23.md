# Change Impact — Storyboard Ordered Duration Budget — 2026-08-23

> **Status:** Active first-pass implementation; Designer review amendments are binding; build/package/open are explicitly deferred.

## Last verified checkpoint
- Parent source: current Storyboard connected-context, text-model/status, and no-active-Play implementation.
- Protected fallback/tester remains untouched.
- Plan amended in place: `.hermes/plans/2026-08-23_164005-storyboard-ordered-duration-budget.md`.
- Designer input is immutable: `docs/design/reviews/storyboard-ordered-duration-budget-design-review-2026-08-23.md`.

## Scope
- In scope: pure ordered duration budget; model fallback; locked reservation/conflicts/locked-zero; active next-gen duration selector accessibility and CSS; deterministic renderer reconciliation; neutral derived 0s helper; migration/persistence normalization; workflow resolver and shot compiler zero-duration rejection; focused tests and TypeScript; exact canonical Storyboard/design implementation docs; Developer task-local procedure pitfall after green.
- Out of scope: legacy `App.tsx`/`styles.css`, unrelated nodes/providers, provider calls, live UI, screenshots, AX/DOM, Obsidian, profiles, projects/tasks, Git, outputs, build, package, open, candidate mutation, promotion, full suite, ASAR/hash/signing/audit.
- Files allowed to change:
  - `work/src/shared/storyboardDurationBudget.ts` (new)
  - `work/src/shared/storyboardDurationBudget.test.ts` (new)
  - `work/src/renderer/src/UtilityNodes.tsx`
  - `work/src/renderer/src/styles-next.css`
  - `work/src/renderer/src/productSurface.test.ts`
  - `work/src/shared/storyboardMigration.ts`
  - `work/src/shared/storyboardMigration.test.ts`
  - `work/src/shared/workflowResolver.ts`
  - `work/src/shared/workflowResolver.test.ts`
  - `work/src/shared/shotSpec.ts`
  - `work/src/shared/shotSpec.test.ts`
  - exact affected canonical Storyboard/design implementation docs
  - `skills/prism-foundry-product-standard/SKILL.md` only after behavior is green
  - this record and the existing plan.

## Dependencies
- Feature/node: active Storyboard Single Sequence and Separate Shots duration controls.
- Runtime boundary: pure shared reconciler -> active renderer persisted node state -> workflow resolver -> provider shot compiler.
- API/provider: no endpoint/request invocation; zero-duration request assembly is blocked before provider work.
- Contract/schema: no expansion; `number | 'auto'` remains backward-read only, new writes numeric.
- Persistence: migration/reopen must be idempotent and preserve prompts/order/locks/numeric 0.
- Design: 315px node, 8px/400 triggers, 10px/400 duration options, full-opacity muted disabled rows, 2px violet focus, neutral helper above footer, no unrelated style changes.

## Protected behavior
- Cut/Continue, SHOT/BEAT/HARD CUT, prompts, tags, Revamp eligibility, locks, camera/shot-size controls, text providers, and unrelated nodes remain unchanged.
- Separate Shots remains independent per-panel model max.
- Locked duration is never silently mutated; locked 0 never auto-recovers.
- Disabled options remain visible but cannot be selected or entered by any pointer/keyboard/typeahead route.
- Derived zero/helper/conflict copy does not overwrite unrelated persisted `data.error`.
- Zero-duration panels persist and remain text-Revamp eligible but block downstream request compilation.

## Migration and rollback
- No schema version or hidden desired-duration field.
- Legacy Auto normalizes to numeric values; migration remains idempotent.
- Surgical rollback: restore only listed files and remove the new shared helper/tests; preserve all unrelated working changes and the current tester.

## Verification
- Strict vertical RED→GREEN tests for pure budget, selector contract, renderer wiring, migration/reopen, resolver block, and shot compiler defense.
- Final first-pass gate: focused affected tests plus `npm run typecheck` only.
- Stable snapshot manifest: exact changed paths and SHA-256 hashes after green/typecheck.
- Deferred: build, packaging, opening, provider checks, full suite, UI/Designer physical inspection.
