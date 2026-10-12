# Release

> **Status:** Current with Required gaps

Current packaging builds an ARM64 macOS DMG with hardened runtime. Public signing, notarization, update delivery, and automatic updater rollback are not implemented.

Release promotion requires source/version identity, dependency lock, tests, typecheck, production build, security checks, artifact hashes, packaged-app smoke tests, and a verified rollback parent.

## Local signing continuity — 12 October 2026

The current installed Prism Foundry uses the existing Apple Development identity rather than an ad-hoc signature. Its bundle identifier, main/helper entitlements and application payload were preserved. A resource-change check retained the designated requirement, and the installed app reopened without a password prompt. This establishes bounded local development signing; public Developer ID signing, notarization and subsequent-update credential continuity remain separate acceptance checks.

For future local packaging, use the configured existing certificate-backed identity, preserve each executable bundle’s own entitlements, sign nested code before its enclosing app and run strict deep signature verification. Record designated requirements before/after and verify actual credential-backed service use after installation. Do not silently fall back to ad-hoc signing or change Keychain access controls. Keep the sole installed slot and verified rollback archive. Audyt’s `tool/sign_macos_package.sh` demonstrates identity configuration and expanded-entitlement preservation; adapt the procedure to Electron instead of copying Flutter framework paths. See [Apple code signing and Keychain tracking](https://developer.apple.com/library/archive/technotes/tn2206/_index.html).

Runtime receipts: the canonical Codex Apps/Prism task contains `Stable Signing Installed Evidence.json`, `Stable Signing Candidate Verification.json` and `Prism Foundry Stable Signing.zip`. The unchanged installed `app.asar` SHA-256 is `7e12c7efaeb01699adc10d7036127c5d1fe17fd2fa71763881e00be04bf17b7c`.

## Verified releases

- [Combined Prism production promotion — 2026-08-26](combined-prism-production-promotion-2026-08-26.md)
- [Prism asset and reference upgrade v4](prism-asset-reference-v4-2026-08-21.md)
- [Hermes runtime promotion](hermes-runtime-promotion-2026-08-21.md)
- `storyboard-character-wire-repair-v7-2026-08-21.md` — existing Codex-built candidate inspection record; not approved or promoted
- [Rollback policy](rollback.md)

## Existing-candidate inspection

When Codex has already built a candidate, inspect that exact artifact rather than rebuilding, repackaging, resigning, regenerating, replacing, launching a second copy, approving, or promoting it. Record the exact artifact path, `app.asar` SHA-256, bundle identity, signature result, and packaged readback, then compare those facts with current Hermes source and tests. Keep static package evidence separate from visual/runtime evidence.

Use isolated temporary user data and a temporary project/fixture, preserve the approved fallback and Hermes source edits, and do not mutate a user project to obtain evidence. A native file chooser or foreground-approval failure must not be bypassed. Record the affected visual/runtime coverage as incomplete and stop before candidate approval or promotion. Observed missing Storyboard Image Layout UI/CSS is package evidence only; it never authorizes a rebuild.

## Codex build/repair provenance assimilation

Magnific should learn Codex's bounded implementation method, not merely inspect its output and not copy its source. The preserved evidence is:

- Codex source: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/AI Video/Magnific Style Software`
- Codex session evidence: `/Users/mrkokom/.codex/sessions/2026/08/21/rollout-2026-08-21T09-39-42-01a021f9-52ef-7822-a09d-cd1053d52883.jsonl`
- Codex artifact: `Codex/AI Video/Magnific Style Software/outputs/candidates/Prism/mac-arm64/Prism.app`, `app.asar` SHA-256 `d4cc397c4695d082987dddce1ae45bd16176b1b8664ae2b1c8e43b67ead8c3bf`, bundle `com.cocombees.prism.codex`
- Hermes comparison artifact: `outputs/candidates/2026-08-21-storyboard-character-wire-repair-v7/mac-arm64/Prism Flight Tester.app`, `app.asar` SHA-256 `85154625d362d63bbe0c9e4b25c3523e49e06f3f6936f53c40789f41425d3784`, bundle `com.cocombees.prismfoundry`

The evidence reconstructs this sequence: lock one parent/checkpoint and one task boundary; split the repair into bounded source lanes; run focused tests and typecheck; resolve the smallest integration/test-contract failures; run the accumulated master suite; build; package with `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dir --arm64`; ad-hoc sign and strictly verify; inspect archive readback; then use an isolated app identity/profile for runtime inspection. The first package attempt's GitHub DNS failure and explicit retry are recorded, not hidden.

Adopt the focused-first gates, exact handoff evidence, source-to-package identity checks, distinct runtime identity, and no-paid-operation boundary. Reject wholesale source copying, same-bundle/shared-user-data launches, reuse of an output folder that can be removed during a failed package, packaging before source gates, and treating source-string tests, green counts, or ad-hoc signing as visual acceptance. This is a process lesson, not approval or promotion of v7.
