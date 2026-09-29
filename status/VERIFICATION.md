# Verification

Updated: 2026-08-26

## Combined production promotion — verified

### Release gates

- Documentation router: 2/2 passed.
- Full suite: 141/141 files and 1,038/1,038 tests passed.
- Focused accepted-feature gate: 20/20 files and 327/327 tests passed.
- Hydration/source-focused gate: 181/181 tests passed.
- Typecheck: passed.
- `npm audit --audit-level=low`: zero vulnerabilities; no dependency upgrade.
- Production build: passed.

The original 19 failures were resolved without weakening the accepted contracts: one real hydration regression was fixed RED→GREEN; nine product-surface expectations, three persisted-project expectations, two shutter expectations, one cinematic-direction expectation, one node-port expectation, one successor-surface expectation, and one Admin documentation-router dependency were corrected. One additional stale safe-state hydration assertion was corrected; its focused gate passed 29/29.

### Source and artifact identity

- Canonical source parity: 302 staging / 302 canonical; zero staging-only, canonical-only, or hash mismatch.
- Shared source manifest: `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`.
- Bundle ID/product/version/architecture: `com.cocombees.prismfoundry`; Prism Foundry; `0.1.0`; arm64.
- `app.asar`: `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Executable: `1db278d931d0ba5a95d4be61609faac68f62779f44f319f58f06cae9c575ea62`.
- Developer app-tree evidence: 280 entries; manifest `193376d9aec7493083a5137a2069fc865e66c61a8abf3503943430bafa5befce` across staged, canonical, and ZIP-extracted apps.
- ZIP: `a289b789df493d204354dc8c9a0c73392ffc87f912f646897492f6b33c3fa7cd`.
- Canonical app and ZIP-extracted app passed deep/strict local ad-hoc signature verification.
- Root launcher is an unchanged symlink resolving to `outputs/build/mac-arm64/Prism Foundry.app`.
- Live main executable observed after launch: `outputs/build/mac-arm64/Prism Foundry.app/Contents/MacOS/Prism Foundry`.

### Non-migration safety

- All ten checkpoint-listed protected registry/project records matched before launch.
- Developer's before/after reports show 10/10 byte-identical after launch.
- Admin independently rehashed all ten current records against the immutable checkpoint: 10/10 equal, without exposing file contents.
- No provider call, media generation, credential access, migration, project write, or UI interaction occurred.

### Promoted feature coverage

- Filmic Motion contract and output/capture-FPS exposure basis.
- Natural Skin qualification/suppressor/provider-body behavior.
- User/Manual first-seed/reset-only ownership, byte-exact edits, optional tags, and exact purple graph-truth tags.
- All four Handheld/Shoulder support semantics, exclusions, locked-Static conflict, and hidden Revamp preservation.
- Active/current project hydration independent of slow Recent Projects; delayed recent-list-only update; duplicate startup refresh suppression.

Provider-native support, provider-output efficacy/adherence, four-way output separability, and repeatability remain unverified.

### Distribution limitation

The bundle is local ad-hoc signed. Developer ID signing, Team ID, notarization, public Gatekeeper readiness, update delivery, and automatic updater rollback are not verified or implemented.

## Immutable rollback verification

- Checkpoint: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate`; `uchg` remains set.
- Rollback app: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`.
- Rollback `app.asar`: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Rollback executable: `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`.
- Rollback tree matches its immutable 290-entry checkpoint manifest with zero missing/extra/mismatch; deep/strict signature verification passed.

Full evidence: `docs/release/combined-prism-production-promotion-2026-08-26.md`.
