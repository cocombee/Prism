# Latest Handoff

## Ownership

- Developer owns future Prism software architecture, implementation, testing, building, packaging, and release execution.
- Admin owns Hermes/Drive/Obsidian structure, documentation lifecycle, release indexing, checkpoint references, and authorized exact cleanup.
- Mechanic remains invocation-only for one bounded physical UI action.
- The existing AI Video → Prism project/task/profile identities are unchanged.

## Current state

The user-approved combined Prism release was promoted to canonical production on 2026-08-26.

- Canonical source: `work/`.
- Canonical app: `outputs/build/mac-arm64/Prism Foundry.app`.
- Root launcher resolves exactly to the canonical app.
- Current ZIP: `outputs/Prism Foundry macOS arm64.zip`.
- Combined release includes Filmic Motion, Natural Skin, User/Manual byte ownership with optional tags and exact purple graph-truth tags, all four Handheld/Shoulder support semantics, and the no-visible-change hydration fix.
- Full gates: docs 2/2; Vitest 141/141 files and 1,038/1,038 tests; focused 20/20 files and 327/327 tests; hydration/source 181/181; typecheck/build passed; audit zero vulnerabilities.
- Source parity: 302/302, zero missing/extra/mismatch; manifest `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`.
- Promoted `app.asar`: `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Executable: `1db278d931d0ba5a95d4be61609faac68f62779f44f319f58f06cae9c575ea62`.
- ZIP: `a289b789df493d204354dc8c9a0c73392ffc87f912f646897492f6b33c3fa7cd`.
- Ten protected registry/project records remained byte-identical; no provider/media/credential/migration/UI interaction occurred.

## Rollback

- Immutable checkpoint: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate` (`uchg`).
- Rollback app: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`.
- Rollback `app.asar`: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Rollback executable: `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`.
- Deep/strict signature verification passed.

## Limits

Provider-native support, generated-output efficacy/adherence, four-way separability, and repeatability remain unverified. Signing is local ad-hoc only; Developer ID signing, Team ID, notarization, public Gatekeeper readiness, update delivery, and automatic updater rollback are not claimed.

## Resume here

Read `docs/CURRENT-STATE.md`, `docs/release/combined-prism-production-promotion-2026-08-26.md`, `status/CURRENT.md`, and the task-local product skill. Do not modify or restart production merely to re-establish context. Any new software transaction remains Developer-owned and must preserve the immutable rollback parent.
