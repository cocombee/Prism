# Character Intake Controls and Layout Validation — Change Impact

> **Status:** Active implementation scope
> **Date:** 2026-08-21

## Last verified checkpoint
- Checkpoint ID: `.hermes/checkpoints/2026-08-21-character-mode-isolated-persistence-v12-approved/manifest.json`
- Source archive SHA-256: `c1f89606f652877cd3054f2b3fedea9b98dc09fc55146e8c6b0b74d71667c8b3`
- Approved `app.asar` SHA-256: `5410cfda66608a7162b8d6afea4f91256d27b4b2d0eb5764b9236c2331a32d5d`
- Passing verification: 137/137 focused tests; 581/581 full tests; TypeScript; production build; zero-vulnerability audit; 25/25 packaged-source parity; strict ad-hoc signature; user confirmed working.

## Scope
- In scope:
  - Give Single image intake the same visible per-photo Trash action as a populated Multi panel.
  - Accept Canvas Assets sidebar Image drops on Single, filling an empty stage or replacing its current image.
  - Add distinct icons to the Multi and Single mode controls.
  - Add a conservative, local image-layout validator: Multi Face rejects images confidently detected as multi-view sheets; Single rejects images that do not show at least two distinct views.
- Out of scope: paid/provider validation, facial recognition, identity matching, generated-view quality scoring, Storyboard controls, aspect-ratio controls, schema migrations, and unrelated node behavior.
- Files allowed to change: Character feature docs; shared Character validation/types/tests; main/preload typed validation bridge and tests; successor Character renderer/CSS/tests; release/status/checkpoint manifests; package output for the next Flight Tester only.

## Dependencies
- Feature/node: Character reusable semantic node only.
- Architecture/runtime boundary: main owns managed-file image decoding; shared owns deterministic layout analysis; preload exposes one typed validation capability; renderer applies the result before assigning a view.
- API/provider: no external provider call and no credential access.
- Authentication/authorization: validation accepts only a managed asset ID resolved under existing managed-root checks.
- Contract/schema: additive runtime result type only; no persisted schema change.
- Persistence/data: rejected images remain in the ordinary asset library but are not assigned to the Character mode/view; accepted replacement preserves opposite-mode members and replaces only the active mode/view.
- Design: existing Trash action styling and shared Lucide icon vocabulary.
- Tests/release: pure layout fixtures, main/preload surface guards, successor UI/drop guards, existing mode/persistence regressions, full suite, typecheck, build, package/sign/hash, launch smoke.

## Protected behavior
- Preserve all user-approved v12 behavior: mode-isolated rendering/hydration/save, managed Character ownership, global contact-sheet previews, existing rename/export, Multi missing-panel completion, Single nine-view composite generation, and shared Model → Save → Play footer.
- Multi non-Face panels remain locked until a valid Face is assigned.
- Dropping a sidebar asset never deletes or mutates the source library record; assignment updates Character metadata through the existing managed-asset path.
- Storyboard retains no Single/Multi controls. Neither Character mode gains an aspect-ratio selector.

## Migration and rollback
- Data/schema change: none.
- Backup/restore proof: approved source is archived at the checkpoint above; canonical runtime was rebuilt from that source and its `app.asar` matches the approved hash exactly.
- Surgical rollback set: only the files listed in Scope plus the new validator module/tests and the new tester candidate. Failed candidates never parent another attempt.

## Verification
- Targeted tests: Character layout analysis; successor Character intake/drop/icon/delete surface; typed preload/main bridge.
- Cross-boundary regression tests: Character persistence, semantic collection isolation, workflow resolver, product/successor surfaces.
- Typecheck/build: `npm run typecheck`, `npm run build`.
- Physical UI/provider/release checks: no paid provider run; package one isolated Flight Tester, ad-hoc sign, strict verify, hash/readback, open for user testing.

## Validator interpretation
This is intentionally a simple **layout** validator, not face recognition. It uses local image structure to block confident mismatches while avoiding provider calls: a clear multi-panel/contact-sheet image is invalid for Multi Face, and a clear one-view image is invalid for Single. Ambiguous images are accepted with no claim that eye, mouth, identity, or exact yaw was semantically verified.
