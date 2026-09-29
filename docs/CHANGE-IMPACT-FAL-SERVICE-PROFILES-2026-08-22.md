# Change Impact — Multi-Service Account Profiles — 2026-08-22

## Last verified checkpoint
- Checkpoint ID: v16 focused offline-gallery tester; v15 remains canonical rollback.
- Source hashes: `main/index.ts` `26e957…3274`; `preload/index.ts` `fc873d…c0d`; `shared/types.ts` `930ec8…7aed`; `AppNext.tsx` `71012b…a8ec`; `styles-next.css` `841f1c…fb3a`.
- Passing verification: focused renderer/product tests, TypeScript, and production build passed before this change; v16 remains unapproved and unpromoted.

## Scope
- In scope: global account profiles for every service; encrypted per-profile keys; existing-key migration; per-service defaults; project preferences; disconnect/reconnect/sign-out/delete; expanded Connections managers; hover-only rename controls; provider-aware blocked Run handoff.
- Out of scope: OAuth, Prism user accounts, provider identity/balance/credit lookups, automatic fallback to another paid account, paid live generation, release promotion.
- Files allowed to change: `work/src/shared/types.ts`, `work/src/shared/serviceProfiles.ts` and tests, `work/src/preload/index.ts`, `work/src/main/index.ts`, focused main/renderer tests, `work/src/renderer/src/AppNext.tsx`, `work/src/renderer/src/NodeCardNext.tsx`, `work/src/renderer/src/styles-next.css`, `work/src/renderer/src/project-library-card-controls.css`, and this bounded documentation branch.

## Dependencies
- Feature/node: Connections and provider-dependent Run readiness only.
- Architecture/runtime boundary: renderer → preload → validated IPC → Electron main → encrypted profile storage/provider.
- API/provider: no identity, billing, balance, or credit endpoint is queried by Connections.
- Authentication/authorization: provider API keys authenticate to the provider, not to Prism.
- Contract/schema: additive typed service-profile contracts and optional project profile overrides.
- Persistence/data: global non-secret profile index plus individual safeStorage-encrypted key files; optional project override persisted atomically.
- Design: existing flat Connections card language; every expanded service card spans both columns and reflows fluidly.
- Tests/release: pure profile-selection lifecycle tests, IPC/source contracts, product-surface tests, typecheck/build, fast tester visual handoff.

## Protected behavior
- Existing behavior that must remain unchanged: keys never enter renderer persistence; provider/model browsing remains available; no paid call is triggered by tests or visual QA; natural media/selector fixes remain intact.
- Sibling nodes/surfaces at risk: all provider-dependent generation and assistant paths; project create/open/save; current Connections cards.

## Migration and rollback
- Data/schema change: additive optional project profile overrides and lazy, idempotent legacy-key migration for every provider.
- Backup/restore proof: preserve each legacy credential until the profile index and encrypted profile credential are durably written; migration must be idempotent and tests must prove no key value enters metadata.
- Surgical rollback set: the exact files listed in Scope; pre-change source archive stored outside the task tree.

## Verification
- Targeted tests: service-profile pure/storage tests; renderer product-surface/IPC contract tests.
- Cross-boundary regression tests: legacy migration, profile selection, missing/disconnected/signed-out credential resolution, default-following versus project override, destructive lifecycle behavior.
- Typecheck/build: `npm run typecheck`; `npm run build`.
- Physical UI/provider/release checks: package/open one fast Flight Tester; inspect expanded/retracted layout and account-state controls without entering real credentials or running paid generation; user performs final credential/live-provider acceptance.

## Outcome
- Focused verification: 147/147 tests passed across 5 files; TypeScript passed. Final production build and tester check follow this documentation update.
- Behavioral decision: every provider uses sequential local, renameable account names; Connections performs no provider identity/balance lookup. Reconnect only lifts the retained-key blocker.
- Promotion state: focused tester only; v16 remains unapproved and unpromoted.
