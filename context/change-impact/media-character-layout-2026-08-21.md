# Change impact - Media intrinsic ratio and Character editor density

Date: 2026-08-21
Status: In progress

## Last verified checkpoint
- Checkpoint ID: stopped source checkpoint after rejected v8 review; failed candidates are evidence only and are not parents.
- Source hashes:
  - `NodeCardNext.tsx`: `65a43e8637c2dd4475e3f4fe16f99abbe61234a672e60317caa0c448ae2014a3`
  - `styles-next.css`: `2e9d54dbf206a6e6970b2b5351853c1c80e97982dfa3e8f39aad9ca82213e775`
  - `successorSurface.test.ts`: `aede9095c7e0debf29e1bfe707b934a16b86630b2b8948d4b35508051537a10b`
- Passing verification: 66 files / 575 tests, TypeScript, production build, audit 0 vulnerabilities before this UI correction.

## Scope
- In scope: ordinary Media intrinsic aspect ratio and fluid height; removal of the Character aspect-ratio selector from both Multi and Single; intrinsic-ratio Single preview; compact centered Single Save footer with deliberate inline padding.
- Out of scope: Character transaction findings, Storyboard freshness, providers, persistence migration, launcher/fallback, candidate approval/promotion, Obsidian projection.
- Files allowed to change: `work/src/renderer/src/NodeCardNext.tsx`, `work/src/renderer/src/styles-next.css`, `work/src/renderer/src/successorSurface.test.ts`, this impact record, and later release/status evidence if a new candidate is produced.

## Dependencies
- Feature/node: Media and Character reusable node editor.
- Architecture/runtime boundary: renderer only.
- API/provider: no request-shape or provider call changes.
- Authentication/authorization: none.
- Contract/schema: no schema addition; legacy `characterAspectRatio` data may remain readable but has no Character UI control.
- Persistence/data: preserve existing ratio persistence and all view assignments.
- Design: flat dark Prism tokens, fixed 315px Character width, adaptive Media height, compact control and Save geometry.
- Tests/release: source-contract regression, full suite, typecheck, build, isolated packaged visual inspection.

## Protected behavior
- Existing behavior that must remain unchanged: Face-only Single; nine-view Multi; mode switching retains views; no Character or Storyboard aspect-ratio mode control; fixed Character width; local preview clipping; Output rounding; no provider run.
- Sibling nodes/surfaces at risk: Output/Upload ordinary media, reusable Character Browse preview, Element/Location view grids, shared selector menus and reusable footer.

## Migration and rollback
- Data/schema change: none.
- Backup/restore proof: the three pre-edit hashes above identify the exact surgical rollback set.
- Surgical rollback set: only the three renderer/test files listed above.

## Verification
- Targeted tests: `successorSurface.test.ts` RED then GREEN.
- Cross-boundary regression tests: full `npm test`.
- Typecheck/build: `npm run typecheck`, `npm run build`.
- Physical UI/provider/release checks: inspect Media portrait/landscape intrinsic sizing and Character Multi/Single with no ratio selector plus centered Save in isolated Flight Tester. Run no provider.
