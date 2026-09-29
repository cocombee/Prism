# Current State

Updated: 2026-08-26

## Profile ownership

- Developer owns Prism software architecture, implementation, tests, builds, packaging, and software continuation.
- Admin owns Hermes/Google Drive/Obsidian structure, documentation lifecycle, release indexing, checkpoint references, and exact cleanup authorized by the user.
- Mechanic is invocation-only for one bounded physical UI action and does not own or switch the task.
- The existing AI Video → Prism project/task/profile identities remain unchanged.

## Active objective

The user-approved combined Prism release is promoted to canonical production. Preserve the verified runtime, immutable rollback parent, protected project/registry state, and distinct ownership.

## Current verified state

- Canonical source: `work/`.
- Canonical app: `outputs/build/mac-arm64/Prism Foundry.app`.
- Root launcher resolves exactly to that app.
- Current ZIP: `outputs/Prism Foundry macOS arm64.zip`.
- Live executable observed by Developer after promotion: `outputs/build/mac-arm64/Prism Foundry.app/Contents/MacOS/Prism Foundry`.
- Combined release includes Filmic Motion, Natural Skin, User/Manual byte ownership with optional tags and exact purple graph-truth tags, all four Handheld/Shoulder support semantics, and non-blocking active-project hydration.
- Hydration completes the active/current project independently of slow Recent Projects; delayed recent results update only the list; duplicate startup refresh is suppressed; no visible design or migration changed.
- Documentation router 2/2; full Vitest 141/141 files and 1,038/1,038 tests; focused accepted features 20/20 files and 327/327 tests; hydration/source focused 181/181; typecheck/build passed; audit reports zero vulnerabilities.
- Canonical source parity: 302/302, zero missing/extra/mismatch; manifest `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`.
- Promoted `app.asar`: `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Promoted executable: `1db278d931d0ba5a95d4be61609faac68f62779f44f319f58f06cae9c575ea62`.
- ZIP SHA-256: `a289b789df493d204354dc8c9a0c73392ffc87f912f646897492f6b33c3fa7cd`.
- Ten protected registry/project records matched the checkpoint before launch and remained byte-identical after launch. No provider/media/credential/migration/UI interaction occurred.

## Limits

- Provider-native support, output efficacy/adherence, four-way separability, and repeatability remain unverified.
- Signing is local ad-hoc only. Developer ID signing, Team ID, notarization, public Gatekeeper readiness, update delivery, and automatic updater rollback are not claimed.

## Rollback

- Immutable checkpoint: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate` (`uchg`).
- Rollback app: `.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`.
- Rollback `app.asar`: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Rollback executable: `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`.
- Full route and release evidence: `docs/release/combined-prism-production-promotion-2026-08-26.md`.

## Next action

No software action is required. Keep production and rollback unchanged unless the user explicitly authorizes a new Developer-owned implementation/release transaction or rollback.
