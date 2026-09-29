# Prism Storyboard, Character, and dynamic-wire repair candidate v7 — 2026-08-21

> **Status:** Candidate only — inspection closed, rejected for acceptance by independent read-only review, not promoted, and not a repair parent. This follow-up changes documentation only.

## Scope

- Restore accepted Storyboard behavior: no Image Output Multi/Single UI or behavioral persistence; every authored panel remains available to compiled-sheet generation and downstream Video routing.
- Strip legacy mistaken Storyboard layout fields without changing panels or compiled media.
- Implement Character `multi | single` with legacy/default Multi, Face-only Single intake/downstream/preview, persisted Single ratio, lossless mode switching, and hidden compiled-sheet Multi downstream behavior.
- Reconcile existing incoming wires after dynamic Image/Video/Upscaler model changes using declared `nodeInputPorts`; preserve roles, explicitly disconnect incompatible edges, and remeasure React Flow node internals.

## Automated evidence

- Focused RED/GREEN regressions: Storyboard migration/generation/resolver/surface; Character downstream, previews, and editor state; dynamic-edge reconciliation.
- Original repair record: 64 files / 568 tests passed before the release record was added to the documentation branch map.
- TypeScript: `tsc --noEmit` passed.
- Dependency audit: 0 vulnerabilities.
- Production build: passed; packaged entry is `out/renderer/index-next.html`.

## Candidate artifact

- Bundle: `outputs/candidates/2026-08-21-storyboard-character-wire-repair-v7/mac-arm64/Prism Flight Tester.app`
- Product/binary name: `Prism Flight Tester`
- Architecture: arm64.
- Bundle identifier: `com.cocombees.prismfoundry`.
- Signing: ad-hoc; `codesign --verify --deep --strict --verbose=4` passed.
- `app.asar` SHA-256: `85154625d362d63bbe0c9e4b25c3523e49e06f3f6936f53c40789f41425d3784`.
- Packaged entry/CSS/JS hashes were read from `app.asar`. Character mode/ratio UI, explicit disconnect messaging, and Single CSS are present. Storyboard mode/layout UI and CSS are absent. The only packaged mistaken-field literals are removal-only destructuring in `acceptedStoryboardData` for legacy migration.

## Visual evidence and limit

- Candidate launched without a provider call.
- Empty Project Library rendered correctly with no broken bundled imagery.
- A Canvas index rendered correctly after relaunch.
- Background and foreground computer-use could not safely drive the Electron window; the typed page rung correctly refused it as a non-browser.
- A localhost DevTools inspection used an explicit temporary project attempt, but the next relaunch restored `/Users/mrkokom/Downloads`; visual isolation was therefore not trustworthy. Interaction stopped immediately and the process was killed. No changed Storyboard/Character/wire path is claimed visually accepted, and no user-project mutation is claimed verified because no before/after project hash was available.

## Approval state

- Independent read-only Codex review: complete; acceptance rejected.
- Review blockers: Storyboard migration may overwrite newer authored panels and clear stale state; async compilation may overwrite intervening edits; Character save/reopen may retain removed/replaced managed views and stale Multi-sheet metadata; Character save mutates records before transaction success.
- Documentation-router issue observed by review: this release record was initially absent from `BRANCH-MAP.md`; the branch map is now updated. No source or candidate action was taken to address it.
- User acceptance: pending.
- Provider runs: none.
- Promotion/root launcher change: none.
- Approved fallback remains `outputs/build/mac-arm64/Prism Foundry.app`, `app.asar` SHA-256 `e6637e0023bc606a65d6f8fdf060082fee57e0821d7971bebfbf90d131662cc4`.
