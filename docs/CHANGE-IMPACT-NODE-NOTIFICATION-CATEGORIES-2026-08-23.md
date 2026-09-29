# Change Impact — Active Node Notification Categories — 2026-08-23

> **Status:** Active Designer-approved C-01..C-06 migration; pre-build gate only.

## Active boundary
- `AppNext.tsx` imports `NodeCardNext.tsx`; only active `NodeCardNext.tsx` is an edit target.
- Legacy `NodeCard.tsx`, `App.tsx`, and `styles.css` remain untouched.

## Scope
- Add one shared semantic notification classifier and safe terminal-progress expiry decision helper.
- Centralize node transient completion expiry at 5200ms with node-id + exact-progress timer guards.
- Apply running/transient/error categories to generic active nodes, Storyboard, and Assistant.
- Split global transient information from persistent actionable errors.
- Unify comparable lifecycle-row geometry while preserving readiness and Storyboard helper lifecycles.

## Protected behavior
- Preserve providers, generation, results, Rerun/Stop, Storyboard helper/order, readiness truth, phone tags, selector fallback, native scrolling, caret/native history, Canvas history sanitization, and Revamp All atomicity.
- No build/package/open until the focused stable snapshot is audited.

## Verification
- Strict RED→GREEN pure category/lifecycle tests and active renderer contracts.
- Focused affected regression tests and TypeScript.
- Snapshot: `/tmp/prism-all-fixes-notification-prebuild.json`.
