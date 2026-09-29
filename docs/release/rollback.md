# Release and Feature Rollback

> **Status:** Required workflow; automatic app-updater rollback is not implemented

## Command semantics

- **Rollback:** restore the exact attempted change set to the last verified checkpoint, verify hashes and regression gates, then stop.
- **Redo:** restore the last verified checkpoint first, then retry from a clean base using failure evidence.
- **It doesn't work:** freeze evidence, restore the verified checkpoint, diagnose root cause, then redo without parenting from the failed candidate.

A checkpoint contains accepted source/docs, dependency lock, schemas, hashes, verification evidence, and—when releasing—the approved build. Rollback preserves unrelated user work and restores only the transaction's touched files.

A migration without a tested backup-and-restore path must not begin. A failed candidate may inform diagnosis but never replace the approved rollback parent.

## Existing-candidate inspection boundary

When a Codex-built candidate already exists, inspect that exact artifact in place; do not rebuild, repackage, resign, regenerate, replace, approve, or promote it as an inspection workaround. Preserve the approved fallback and all current Hermes source edits. Use isolated temporary user data/project state, keep artifact hash/signature/readback evidence separate from visual/runtime evidence, and stop before approval or promotion when a native chooser or foreground-approval failure prevents complete visual coverage.

Asset filename normalization is a migration: release evidence must prove rollback of the physical case-only rename together with asset index, workflow, history, URLs, and portable document. Candidate startup and automated tests must not mutate the protected user project merely to obtain this evidence; use isolated fixtures for transaction failure injection.

## Current verified rollback parent — 2026-08-26

The current production release is `combined-prism-production-promotion-2026-08-26.md`. Its immutable rollback parent is:

`.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate`

The runnable rollback app is:

`.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`

- Checkpoint flag: `uchg`.
- Rollback `app.asar`: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Rollback executable: `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`.
- Immutable app-tree evidence: 290 entries; manifest `f173977f0b8f874138580e4aa72f00a42230a4b30bd2b01c26a92819db36f565`.
- Deep/strict signature verification passed.

Rollback requires explicit authorization. Stop Prism first, verify the checkpoint/app hashes and signature, atomically replace only `outputs/build/mac-arm64/Prism Foundry.app` with a verified rollback copy, preserve the root launcher target, then verify the restored physical executable before launch. Source restoration is separately approval-gated. Never restore user data from `project-state-hashes.json`; it is hash-only evidence, not a backup.
