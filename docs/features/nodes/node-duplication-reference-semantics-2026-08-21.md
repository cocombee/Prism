# Node Duplication Reference Semantics — Change Impact

> **Status:** Active implementation scope
> **Date:** 2026-08-21

## Last verified checkpoint
- Checkpoint ID: promoted Character intake validation v13.
- Source archive: `outputs/candidates/2026-08-21-character-intake-validation-v13/source/work-source.tgz`.
- Canonical `app.asar` SHA-256: `84ba4ca360e6960614b46eb9e1d5c4a40e0c509ffca6941d9108453121ee4537`.
- Passing verification: 214 focused tests, 589 full tests, typecheck, production build, audit, package/source comparison, codesign, arm64 launch.

## Scope
- In scope: duplicate a Canvas node as another graph instance while preserving its authored inputs/selections, resetting transient run state, and referencing the same managed assets; prevent duplicate selector entries caused by repeated node instances of one reusable asset. Also repair Single validation for downscaled multi-panel Character sheets reported during this edit.
- Out of scope: duplicating managed files, changing asset IDs, copy/paste across projects, changing Save/Rename/Trash/Export semantics, or changing node placement.
- Files allowed to change: `work/src/renderer/src/rendererBehavior.ts`, its focused test, `work/src/renderer/src/AppNext.tsx`, `work/src/shared/characterImageValidation.ts`, its focused test, affected documentation, candidate manifest/status/handoff.

## Dependencies
- Feature/node: node Duplicate command and reusable Character/Element/Location/Style selectors.
- Architecture/runtime boundary: renderer graph state only; no main/preload/IPC calls.
- API/provider: none.
- Authentication/authorization: none.
- Contract/schema: no schema change; cloned nodes retain existing `ImportedAsset` IDs and paths.
- Persistence/data: workflow gains one node instance; `assets.json` and managed media remain unchanged.
- Design: existing collision-aware duplicate placement remains.
- Tests/release: renderer behavior regression, selector-source regression, full suite, typecheck/build/package checks.

## Protected behavior
- Existing input selections, selected model/provider/settings, reference assets, generated media, and active result remain on the duplicate; transient running/progress/error state resets.
- Duplicate receives a fresh node ID and collision-aware position; it does not inherit group membership or UI selection.
- Asset library, Canvas Assets sidebar, and reusable selectors continue to show one logical asset.
- v13 Character intake behavior remains unchanged.

## Migration and rollback
- Data/schema change: none.
- Backup/restore proof: promoted v13 canonical app and immutable source archive are retained.
- Surgical rollback set: the three renderer source/test files plus this documentation record.

## Verification
- Targeted tests: duplicate snapshot identity/data preservation; reusable selector deduplication; downscaled 3×3 sheet acceptance and labeled single-view protection.
- Cross-boundary regression tests: renderer behavior, product surface, semantic asset collections, workflow persistence.
- Typecheck/build: required.
- Physical UI/provider/release checks: package/sign/hash/source comparison and non-billable app launch; no provider run.
