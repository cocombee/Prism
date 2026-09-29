# Codex Storyboard / Character / dynamic-wire comparison — 2026-08-21

> **Purpose:** Read-only provenance comparison requested by the user. Codex remains non-authoritative and was not edited or used wholesale as a parent.

## Source inspected

- Codex tree: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/AI Video/Magnific Style Software/work`
- Codex candidate: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/AI Video/Magnific Style Software/outputs/candidates/Prism/mac-arm64/Prism.app`
- Codex tree has no Git repository and no Hermes-style status/handoff/release records.

## Verified Codex evidence

- Full suite: 61 files / 548 tests passed.
- TypeScript: passed.
- Dependency audit: 0 vulnerabilities.
- Candidate strict deep code-sign verification: passed.
- Candidate `app.asar` SHA-256: `d4cc397c4695d082987dddce1ae45bd16176b1b8664ae2b1c8e43b67ead8c3bf`.
- Candidate identity: `Prism` / `Prism`.
- Packaged CSS matches Codex `work/out`; packaged renderer JS does not. Packaged JS SHA-256 is `8d0416aec2430f354eda4bd232f5ec9e8395f455cbc68095ac14ad633dfabe25`; current `work/out` JS SHA-256 is `e3bd3014447d4a05429684d85cab52b3bc337e346bdf6bed3a310d97e99242a4`.
- Packaged JS lacks the current source's `characterReadySheet` behavior literal. Therefore the Codex package is not byte-identical to the current behavior-bearing renderer source.

## Codex implementation

- Storyboard has no image Multi/Single control.
- Character stores `characterImageMode: 'multi' | 'single'` and `characterImageAspectRatio`.
- Codex Single means one precomposed, ready multi-angle Character sheet marked with `characterReadySheet`; it is not a Face-only Single image.
- Codex remeasures React Flow internals from a dynamic node/model signature, but does not centrally reconcile every existing edge by semantic role or explicitly disconnect incompatible handles.
- Codex Single save attempts to clear private compiled-sheet metadata by setting `characterSheetPath`, `characterSheetUrl`, and `characterSheetViews` to `undefined` in saved metadata.

## Adopt selectively

- Preserve the explicit negative test that Storyboard has no image-output mode.
- Preserve/reuse the concept of React Flow node-internals remeasurement after any dynamic port signature changes. Hermes already has targeted remeasurement plus stronger central edge-role reconciliation.
- Explicitly clear stale Character compiled-sheet metadata during Single save and prove the cleared state survives managed persistence/reopen.

## Reject

- Reject Codex's ready multi-angle sheet interpretation of Character Single. The active user contract is one Face identity image, no manufactured/contact/compiled sheet downstream.
- Reject wholesale source or package adoption. Codex has no verified source baseline and its candidate renderer JS is stale relative to its current source.

## Shared defects requiring Hermes repair

- `storyboardMigration.ts` prefers linked result panels over newer authored creator panels and unconditionally clears `storyboardNeedsCompile`.
- Async Storyboard compile completion can overwrite intervening panel edits and falsely mark the sheet current.
- Character collection edits can leave removed/replaced managed views available for rehydration.
- Character save mutates managed metadata incrementally before later compilation/commit can fail, without rollback.
- Codex's passing tests encode its different Single-sheet contract and do not cover these failure scenarios.

## Decision

Hermes remains the authoritative repair tree. Use Codex only as bounded diagnostic evidence. Resume Hermes test-first repair of the shared defects, retain Face-only Single semantics and central wire reconciliation, and create a fresh candidate only after independent review and all release gates pass.
