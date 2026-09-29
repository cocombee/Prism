# Combined Prism Production Promotion — 2026-08-26

> **Status:** Promoted and independently reconciled

## Scope and ownership

Developer promoted the user-approved combined Prism candidate. Admin independently reconciled release documentation, rollback references, Obsidian projection, and only the exact cleanup authorized by the user. Software source/tests, promoted app/ZIP, launcher, user project/registry data, credentials, and the running process were not changed by Admin.

The promoted release includes:

- Director-approved Filmic Motion semantics with capture/output FPS distinct from Motion FPS and shutter/exposure provenance;
- deterministic Natural Skin qualification and hidden provider-body compilation;
- User/Manual first-seed/reset-only byte ownership, optional tags, and purple authority only for exact connected graph-truth tags;
- all four persisted Handheld/Shoulder support semantics, merged/deduplicated exclusions, locked-Static conflict handling, and hidden Revamp preservation;
- active/current project hydration independent of slow Recent Projects, delayed list-only recent updates, and duplicate startup-refresh suppression, with no visible design or data migration.

Provider-native support, provider-output efficacy/adherence, four-way output separability, and repeatability remain unverified.

## Release gates

- Documentation router: 2/2.
- Full Vitest: 141/141 files; 1,038/1,038 tests.
- Focused accepted features: 20/20 files; 327/327 tests.
- Hydration/source focused: 181/181 tests.
- Typecheck: passed.
- `npm audit --audit-level=low`: zero vulnerabilities; no dependency upgrade.
- Production build: passed.

The original 19 failures and one additional stale safe-state hydration assertion were resolved without weakening the accepted contracts. The hydration regression was fixed RED→GREEN; the additional focused safe-state gate passed 29/29.

## Canonical source

- Path: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/work`.
- Developer parity: 302 staging / 302 canonical; zero staging-only, canonical-only, or hash mismatch.
- Shared manifest SHA-256: `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`.
- Admin independently compared the retained physical `/tmp/prism-work` staging copy with canonical source under the checkpoint exclusion policy and found zero missing, extra, or mismatched authority entries before cleanup.

## Promoted artifact

- Canonical app: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/outputs/build/mac-arm64/Prism Foundry.app`.
- Root launcher: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/Prism Foundry.app`; unchanged symlink resolving exactly to the canonical app.
- ZIP: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/outputs/Prism Foundry macOS arm64.zip`.
- Bundle ID: `com.cocombees.prismfoundry`.
- Product/version/architecture: Prism Foundry; `0.1.0`; arm64.
- Signature: local ad-hoc; `codesign --verify --deep --strict` passed.
- `app.asar`: `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Executable: `1db278d931d0ba5a95d4be61609faac68f62779f44f319f58f06cae9c575ea62`.
- Developer app-tree evidence: 280 entries; manifest `193376d9aec7493083a5137a2069fc865e66c61a8abf3503943430bafa5befce` across staged, canonical, and ZIP-extracted apps.
- ZIP SHA-256: `a289b789df493d204354dc8c9a0c73392ffc87f912f646897492f6b33c3fa7cd`.
- ZIP extraction matched the canonical app tree and passed deep/strict signature verification.

Admin independently read back the bundle identity, version, arm64 executable, `app.asar`, executable, ZIP hash, launcher resolution, and deep/strict signatures without modifying the artifacts.

## Runtime and non-migration evidence

Developer observed the exact live main executable after promotion:

`/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/outputs/build/mac-arm64/Prism Foundry.app/Contents/MacOS/Prism Foundry`

All ten checkpoint-listed protected registry/project hashes matched before launch and remained byte-identical after launch. Admin independently rehashed the same ten current records against the immutable checkpoint and found 10/10 equal without exposing their contents.

No provider call, media generation, credential access, migration, project write, or UI interaction occurred during promotion.

## Immutable rollback route

Checkpoint:

`/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate`

Rollback app:

`/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`

- Checkpoint remains `uchg` and was not modified.
- Rollback `app.asar`: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Rollback executable: `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`.
- Rollback 290-entry tree matches the immutable checkpoint manifest with zero missing, extra, or mismatch.
- Deep/strict signature verification passed.

If rollback is explicitly authorized: stop Prism; verify the checkpoint and rollback hashes/signature; atomically replace only the canonical physical app with a verified copy of the rollback app; keep the root launcher targeting `outputs/build/mac-arm64/Prism Foundry.app`; verify the restored executable path and signature before launch. Source restoration is separately approval-gated and must use the checkpoint source manifest/exclusions. The hash-only project-state snapshot is evidence, not a data backup, and must never overwrite user projects.

## Distribution limitations

This release is local ad-hoc signed. Developer ID signing, Team ID, notarization, public Gatekeeper readiness, update delivery, and automatic updater rollback are not implemented or verified.

## Admin cleanup ledger

Only the exact user-authorized duplicate/temp paths were considered; no unrelated historical candidate was pruned.

Removed:

- `outputs/build/mac-arm64/Prism Foundry pre-promotion-20260826.app` — independently verified tree-identical to the immutable rollback app, with matching `app.asar` and a valid deep/strict signature, then removed. The first bounded cleanup attempt removed it before stopping safely on a `/tmp` realpath guard; later verification confirmed it remained absent.
- `/tmp/prism-director-filmic-motion-parity-tester-20260826` — superseded temporary runnable/build directory.
- `/tmp/prism-natural-skin-parity-tester-20260826` — superseded temporary runnable/build directory.
- `/tmp/prism-handheld-semantics-tester-20260826` — superseded temporary runnable/build directory.
- `/tmp/prism-production-promotion-20260826` — superseded temporary production package directory.
- `/tmp/prism-work` — physical staging copy, removed only after zero-difference canonical parity and promotion documentation were recorded.

Retained:

- `outputs/Prism Foundry macOS arm64 pre-promotion-20260826.zip` — SHA-256 `d7b307789c7ca9ce4a3c10231a28394abd19d88234715daf97bb92520b16775c`; retained because `ditto` extraction produced a 107-entry app that did not match the 290-entry immutable rollback tree, had `app.asar` `a0a8ef2a727b9fbb7db0dfb4d94e20e004a4388248dbc5af6b63ab1dbad365a6`, and failed deep/strict signature verification. It is not proven redundant.
- `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app` — immutable verified rollback.

## Final promotion status

Promoted and verified. The canonical production app/ZIP/launcher, protected data, credentials, and running process remain outside Admin's mutation scope.
