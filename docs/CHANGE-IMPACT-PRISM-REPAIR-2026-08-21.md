# Prism Foundry Storyboard, Character, and dynamic-wire repair — change impact

> **Status:** Existing-candidate inspection is closed without approval or promotion. Candidate v7 is rejected for acceptance by independent read-only review; this follow-up changes only SOP and continuity documentation. Approved fallback and root launcher remain untouched.

## Last verified checkpoint
- Checkpoint ID: user-authorized surgical repair from the current Hermes `work/` source; the rejected v6 candidate is not a promotion parent.
- Source hashes: no Git baseline is assumed because this workspace is not a repository. The approved fallback `app.asar` remains protected at SHA-256 `e6637e0023bc606a65d6f8fdf060082fee57e0821d7971bebfbf90d131662cc4`.
- Passing verification: 64 Vitest files / 568 tests and `tsc --noEmit` pass after the repair.

## Scope
- In scope: restore accepted Storyboard behavior; move persisted `multi | single` image intake to Character; preserve Character Multi views across mode switches; route Single downstream through Face only and Multi through the hidden compiled sheet; make Character previews mode-aware; reconcile existing incoming edges after dynamic Image/Video/Upscaler model changes; remeasure React Flow sockets; add regressions and package an isolated unsigned Flight Tester candidate.
- Out of scope: provider execution, paid operations, credentials, approved fallback/root launcher mutation, promotion, user-project mutation, unrelated rejected-v6 blockers, and unrelated renderer redesign.
- Files allowed to change in the original repair: affected source/tests under `work/src/`; this impact record; canonical Storyboard, asset-library, node-system, typed-graph, provider-control, status, release, and handoff documents. In this SOP-only follow-up, only task-local procedure/release/testing/rollback/branch-map/status/handoff records are allowed.

## Dependencies
- Feature/node: Storyboard, Character, Image Generator, defensive Image Editor, Video Generator, Upscaler, reusable asset cards/rails/previews.
- Architecture/runtime boundary: renderer state → shared node/asset/connection contracts → managed project persistence → Electron packaging.
- API/provider: request assembly and non-billable preview only; no provider was run.
- Authentication/authorization: no credential, permission, entitlement, or connection-state change.
- Contract/schema: remove Storyboard image-layout mode persistence; Character `characterInputMode?: 'multi' | 'single'` with legacy/default Multi; add persisted `characterAspectRatio`; retain Character Face as the identity anchor.
- Persistence/data: legacy mistaken Storyboard layout fields are discarded without changing panels or compiled media; Character save/library/edit metadata retains mode, ratio, canonical name, Face/view media, prompt, provider, model, and normal asset metadata.
- Design: Storyboard loses Image Output Multi/Single controls; Character gains Multi/Single controls, a ratio-adaptive Single Face stage, Face-only Single previews, and balanced count-aware Multi previews.
- Tests/release: the original repair recorded RED/GREEN focused tests, accumulated suite, TypeScript, production build, dependency audit, isolated packaging, ad-hoc signing, strict verification, and limited non-billable visual inspection. Independent review rejects acceptance; user acceptance and promotion remain unauthorized.

## Protected behavior
- Existing behavior that must remain unchanged: Storyboard two-to-eight panels, Sequence Type, timing, compiled sheet, semantic inputs, saving, stale-map handling, and downstream Video shot routing; Character nine-view Multi workflow, hidden compiled derivative, logical one-asset transactions, rename/export/favorite/delete/relink/grouping/@tag behavior; exact semantic/Start/End graph roles; provider selection.
- Sibling nodes/surfaces at risk: Storyboard Asset migration/preview, Home and Canvas Assets, reusable selection rail and expanded preview, Image/Video/Upscaler model selectors, quick connect, input cardinality, and React Flow handle geometry.

## Migration and rollback
- Data/schema change: Storyboard migration strips `storyboardImageMode`, `storyboardImageAspectRatio`, and mistaken Storyboard `aspectRatio`/`imageResolution` fields while preserving authored panels and compiled output. Character treats only explicit `single` as Single; missing, legacy, and unknown values normalize to Multi.
- Backup/restore proof: the approved fallback and root launcher were not modified. The rejected v6 candidate remains demoted and is not a parent. This repair is source-local until a newly built candidate completes all release gates.
- Surgical rollback set: only the files changed by this repair under `work/src/` plus the affected canonical documents listed above. Rollback returns to the protected fallback, never to a failed candidate.

## Verification
- Targeted tests: Storyboard generation/migration/resolver/surface; Character downstream/preview/editor state; dynamic node-connection reconciliation; accumulated product-surface contracts.
- Cross-boundary regression tests: shared workflow resolver + semantic collections + node connections + active Next renderer + main safety suite.
- Typecheck/build: the original repair recorded 64 test files / 568 tests, `npm run typecheck`, production build, and `npm audit` with 0 vulnerabilities. The independent review reproduced 219/219 focused tests and observed 567/568 for the full suite because the new v7 release record was not yet listed in `BRANCH-MAP.md`; the map is now corrected. No source or candidate gate is rerun in this SOP-only follow-up.
- Physical UI/provider/release checks: no provider call occurred. Static package inspection recorded the exact v7 path, bundle identity, signature, `app.asar` hash, successor entry, Character mode/ratio UI, disconnect messaging, and absence of Storyboard Image Layout UI/CSS. Runtime coverage remains incomplete because the native chooser/foreground approval path blocked the requested changed-path inspection; no approval or promotion is authorized.
