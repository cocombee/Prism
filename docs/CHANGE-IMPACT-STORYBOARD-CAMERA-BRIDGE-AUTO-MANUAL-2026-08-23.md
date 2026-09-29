# Change Impact — Storyboard Camera Bridge Auto/Manual Integration — 2026-08-23

> **Status:** Stable pre-build implementation; build/package/rendered review deferred.

## Scope
- Persist independent Auto/Manual prompt mode, Manual draft, and one-time seed marker.
- Derive Auto live from connected Storyboard and authorities; never persist compiled master authority.
- Make request assembly and Composed Provider Prompt use the active mode.
- Add active Auto read-only prompt, compact mode radio, Manual Reset, and mode-scoped readiness.
- Pass immutable deterministic bridge constraints to Revamp Shot and Revamp All.

## Safety
- Running requests retain their locally built activation request snapshot.
- Auto errors do not enter Manual composition; Manual draft never receives Storyboard timing/camera except first seed or explicit Reset.
- No provider call is used for compile, switching, seeding, or Reset.
- Legacy/inactive renderer source remains untouched.

## Verification
- Strict RED→GREEN ownership/migration/active-boundary tests.
- Focused shared/renderer regressions and TypeScript.
- Snapshot: `/tmp/prism-camera-bridge-all-prebuild.json`.
