# Prism Foundry Current State

> **Status:** Current — combined production promotion verified 2026-08-26

Prism Foundry is a local-first macOS Electron application using React, TypeScript, React Flow, electron-vite, Vitest, electron-builder, `safeStorage`, fal.ai, direct provider APIs, and local project files.

## Current production release

The user-approved combined Prism release is promoted and is now the canonical production runtime.

- Canonical source: `work/`.
- Physical app: `outputs/build/mac-arm64/Prism Foundry.app`.
- Root launcher: task-root `Prism Foundry.app`, an unchanged symlink resolving exactly to the physical app.
- Retained package: `outputs/Prism Foundry macOS arm64.zip`.
- Live executable observed after promotion: `outputs/build/mac-arm64/Prism Foundry.app/Contents/MacOS/Prism Foundry`.
- Bundle/product/version/architecture: `com.cocombees.prismfoundry`; Prism Foundry; `0.1.0`; arm64.
- Signature: local ad-hoc; deep/strict verification passed. Developer ID signing, Team ID, notarization, public Gatekeeper readiness, update delivery, and automatic updater rollback are not claimed.

Exact release evidence and rollback instructions: `release/combined-prism-production-promotion-2026-08-26.md`.

## Promoted combined behavior

- **Filmic Motion:** capture/output FPS, Motion FPS, shutter angle, and exposure provenance remain distinct. The approved 24fps/180-degree exposure contract is compiled without letting Motion FPS drive exposure.
- **Natural Skin:** explicit photographed visible organic-human cases deterministically qualify for the hidden provider-body Natural Skin block; suppressors and no-change cases remain guarded.
- **User/Manual prompt ownership:** Locked seeds only on first entry or explicit Reset; edited User text remains byte-exact and user-owned. Tags are optional. Only exact connected graph-truth tags receive purple authority; unresolved tag-like text remains ordinary.
- **Four camera-support semantics:** all four persisted Handheld/Shoulder support values compile deterministic support-texture clauses, merged/deduplicated exclusions, locked-Static conflict handling, and hidden Revamp preservation.
- **Startup hydration:** the active/current project hydrates independently of slow Recent Projects; delayed recent results update only the recent list; duplicate startup refresh is suppressed. This introduced no visible design or data migration.

Provider-native support, provider-output efficacy/adherence, four-way output separability, and repeatability remain unverified. No live provider call, media generation, credential access, migration, or agent UI interaction occurred during promotion.

## Verification summary

- Documentation router: 2/2.
- Full Vitest: 141/141 files; 1,038/1,038 tests.
- Focused accepted-feature gate: 20/20 files; 327/327 tests.
- Hydration/source-focused gate: 181/181 tests.
- Typecheck, production build, and `npm audit --audit-level=low`: passed; zero vulnerabilities and no dependency upgrade.
- Canonical source parity: 302/302, zero missing/extra/mismatch; manifest SHA-256 `36bd4371eff2a7e5645f146147915b84be8c16cc66ff9db3c35ae4ea66ecd2fc`.
- Promoted `app.asar`: `1c4a7bfc5ec5f41abf550f203d538b5009ca29e708f6137623c18803870ad666`.
- Promoted executable: `1db278d931d0ba5a95d4be61609faac68f62779f44f319f58f06cae9c575ea62`.
- ZIP: `a289b789df493d204354dc8c9a0c73392ffc87f912f646897492f6b33c3fa7cd`.
- Ten protected registry/project records matched the immutable checkpoint before launch and remained byte-identical after launch.

## Rollback parent

Immutable checkpoint:

`.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate`

Rollback app:

`.hermes/checkpoints/2026-08-26-pre-promotion-combined-candidate/rollback-app/Prism Foundry.app`

The checkpoint remains `uchg`. Rollback `app.asar` is `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`; rollback executable is `03e29e1b9838a4d3324f7f3856778a8ae02dd67580db9ad9b368099564b9c464`; deep/strict signature verification passed.

## Runtime boundaries

- Trusted Electron main process owns credentials, filesystem access, provider calls, downloads, project persistence, and privileged protocols.
- Sandboxed preload exposes the typed `PrismAPI` through narrow IPC calls.
- React renderer owns presentation, graph interaction, user-authored state, and request initiation.
- Shared TypeScript modules own graph contracts, provider request compilation, model capabilities, migrations, and pure behavior.

## Implemented security

Context isolation, disabled Node integration, renderer sandboxing, blocked external windows/navigation, encrypted provider keys, active-project checks, managed-root containment, archive limits, atomic JSON writes, and stale-generation rejection.

## Not implemented

Prism user accounts, login sessions, organizations, RBAC, cloud collaboration, server-side entitlements, automatic updater rollback, Developer ID distribution signing, and notarization remain Proposed or Deferred until built and verified.
