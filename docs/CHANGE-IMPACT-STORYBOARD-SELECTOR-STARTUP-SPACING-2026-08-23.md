# Change Impact — Storyboard Selector Startup Fallback and Compact Rows — 2026-08-23

> **Status:** Active focused correction from user screenshot evidence; no provider inference or live catalog refresh is authorized for verification.

## Scope
- Load connected direct-provider model catalogs from connection-state changes rather than only while Connections is open, with per-provider failure isolation.
- Merge only the valid saved Storyboard provider/model into a missing/empty catalog as a text-only visible fallback until live data is available.
- Use the same merged catalogs in active Storyboard rendering and the AppNext Revamp caller.
- Share content-driven compact geometry between the duration helper and Storyboard status.
- Restore native Storyboard grid wheel/trackpad scrolling while retaining propagation isolation from Canvas.

## Protected behavior
- No fallback models for unselected providers; no silent provider/model switch; no inference; no credential changes.
- Existing text-only filtering, provider-scoped identities, newest-three live curation, Revamp one-call/batch contracts, duration budget, colors, borders, ellipsis, reduced motion, and 315px node geometry remain unchanged.
- Current tester remains intact until a fresh replacement package is ready.

## Allowed files
- `work/src/shared/assistantProviderSelection.ts` and focused tests
- `work/src/renderer/src/AppNext.tsx`
- `work/src/renderer/src/UtilityNodes.tsx`
- `work/src/renderer/src/styles-next.css`
- `work/src/renderer/src/productSurface.test.ts`
- exact affected canonical Storyboard docs and Developer task-local skill after green
- this impact record.

## Verification
- Strict RED→GREEN focused helper and active source contracts.
- Focused assistant/provider/Storyboard/product tests, TypeScript, one build, one fresh arm64 directory package/open.
- No live catalog/provider/inference, full suite, screenshot/AX/DOM after open, ASAR/hash/signing/audit, or promotion.
