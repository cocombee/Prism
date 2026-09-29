# Offline Relink, Asset Selection, Rename, And Project Management Impact

> **Status:** In progress
> **Date:** 2026-08-21

## Last verified checkpoint

- Checkpoint ID: promoted v15, `2026-08-21-unified-asset-flows-recovery-v15`.
- Packaged `app.asar` SHA-256: `a79e1c684c9518b4085a90e07286f9c220eb911fb8594ec632b3452c170bcf11`.
- Source archive SHA-256: `75491b32bef1b05c5e1efa22b2697aadc2413690c62c50c999f8ee13b8e8e42f`.
- Passing verification: 69 files / 598 tests, typecheck, production build, zero-vulnerability audit, arm64 package, strict ad-hoc signature, runtime launch.

## Scope

### In scope

- Double-click rename for already-saved Character, Element, Location, and custom Style names on the Canvas node tag, Home Library card, and Canvas Assets side row.
- One atomic logical rename updates all matching nodes, Library/side surfaces, metadata, wrapper folder, and managed member filenames. Unsaved semantic nodes cannot be renamed.
- Deliberate Media Offline presentation for missing image, video, or audio assets, replacing native broken-media fallback rendering.
- Type-aware Find/relink from a missing asset's broken-link action. A replacement must have the exact original basename, compared case-insensitively, and the same media family. Different bytes are accepted as the relinked replacement. Folder search is recursive.
- `Find`/animated `Finding.` → `Finding..` → `Finding...`; red missing state, two-second green found state, then normal purple.
- Existing red application popout reports no exact-name/type match.
- Single-image media stages override the generic semantic button's fixed height, preserve the dropped image's intrinsic ratio with contained, uncropped media, and align side insets to the large preview. Character Multi and Element Multi retain their existing fixed multi-view grid behavior.
- Shift-click ordered range selection and Command-click independent toggle selection in Home Library and Canvas Assets. Library order is left-to-right then row-by-row; Canvas Assets order is top-to-bottom. Modified selection must suppress native browser text/image highlighting.
- Outside Library and Canvas side-asset selection use the same restrained single purple line. Selected outside cards keep that one-pixel line continuously visible around all four corners.
- Project cards reuse the Canvas-card hover language rather than adding a permanent action row: the rename pencil appears beside the title and Remove appears in the upper-right hover controls. Rename changes only the remembered `.prismflow` filename; it does not rename the project folder. Remove deletes the card from Prism's current/recent index without deleting any project file or folder.
- Nested Character, Element, Location, and Style image placeholders accept only ordinary individual images. Saved semantic collections, built-in/saved special assets, video, and audio are not accepted. Finder files use the same media-family gate.
- Single Location/Style placeholders replace rather than append their image, so one placeholder cannot produce duplicate previews from alternate asset IDs.
- Managed preview deletion has Library ownership: it removes the managed asset from both Library surfaces and all deployments while preserving reusable node shells. Multi edit panel deletion stays local. Existing saved Sheets warn that deleting the sole image also deletes the saved asset from Library. Built-in styles remain non-deletable.
- Workflow-only ordinary Media paths absent from `assets.json` are synthesized for offline detection/relink and render the same boxed `Media Offline` state.
- Canvas drops, right-click creation, and wire-created nodes retain the exact pointer coordinate and may overlap. Duplicate is the only collision-aware exception and advances rightward with a 40px gap.

### Out of scope

- Changing Character/Element Multi completion, hidden one-image compilation, or provider request behavior.
- Relinking to a different basename or different media family.
- Renaming the physical project root folder.
- Deleting physical project contents.
- Provider calls, generation, credentials, cloud storage, or paid execution.

### Files allowed to change

- `work/src/renderer/src/AppNext.tsx`
- `work/src/renderer/src/NodeCardNext.tsx`
- `work/src/renderer/src/MediaOfflineState.tsx` (new post-cutoff design target)
- `work/src/renderer/src/media-offline-state.css` (new post-cutoff design target)
- `work/src/renderer/src/index-next.tsx`
- `work/src/renderer/src/styles-next.css` only for minimal integration selectors; visual offline design remains in the new governed stylesheet.
- `work/src/main/index.ts`
- `work/src/preload/index.ts`
- `work/src/preload/index.d.ts`
- `work/src/shared/types.ts`
- New pure shared helpers and focused tests under `work/src/shared/` or `work/src/renderer/src/`.
- Existing relevant source-contract tests only where their intentional contract changes.
- This impact record, branch map, candidate manifest, status, and handoff.

## Dependencies

- Feature/node: semantic assets, ordinary media nodes, Upload/Output media, Home Assets, Canvas Assets, project launcher.
- Architecture/runtime boundary: renderer requests; typed preload IPC; main owns dialogs, filesystem checks, physical rename/copy, recent-project index, and portable-document filename.
- API/provider: none.
- Authentication/authorization: active-project validation and managed-root containment remain required.
- Contract/schema: no stored schema version change is expected; temporary UI selection/finding state stays renderer-local. Existing `ProjectWorkspace` may receive a remembered document-path update only through main storage.
- Persistence/data: `assets.json`, workflow, history, global Style index, recent/current project JSON, `.prismflow` filename, managed semantic folders/files.
- Design: flat Prism dark surfaces; red offline and temporary green recovery are semantic states. Existing protected UI remains visually unchanged outside the new offline state and requested controls.
- Tests/release: pure name/type/range helpers, real temporary-filesystem relink/rename/project-index tests, renderer source contracts, full regression, typecheck, audit, build, ASAR inspection, arm64/sign/hash/runtime tester.

## Protected behavior

- Existing Multi completion and secret compiled one-image behavior for Character and Element.
- v15 Save→Rename→Save, Sheets modes, Location intake, current-session delete Undo, and non-deletable built-in styles.
- Ordinary media physical rename remains lowercase basename-only with encoded extension preserved.
- Reusable collection grouping, internal view metadata/order, `.prismasset` identity, and Canvas reference updates.
- Existing viewer eligibility: Element and Style remain selection-only.
- No provider run or billed action during verification.

## Migration and rollback

- Data/schema change: none expected. Existing records gain no mandatory fields.
- Backup/restore proof: v15 source archive and promoted canonical package hashes above. New filesystem mutations require transactional rollback tests.
- Surgical rollback set: only the files named in Scope plus the new candidate/status records. Failed work never parents a retry.

## Verification

- Targeted tests: exact saved-only rename, physical collection rename rollback; relink name/type matching and recursive folder scan; missing-node rendering contract; intrinsic-ratio classification; Shift/Command range reducer; recent-project remove and `.prismflow`-only rename.
- Cross-boundary tests: semantic collection grouping/transactions, asset deployment/relink, NodeCard successor/product surfaces, workflow persistence, project portable-document behavior.
- Typecheck/build: required.
- Physical UI/provider/release checks: packaged tester at practical Library, Canvas Assets, missing node, relink success/error, project cards, and single-vs-Multi media states; no paid provider action.
