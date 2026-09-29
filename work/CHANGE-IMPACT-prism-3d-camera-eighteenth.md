# Prism Change Impact — 3D Camera Eighteenth Flight Tester (2026-08-30)

> Status: Authorized integrated forward correction from the current Seventeenth source. No launch, stop, install, register, provider call, or physical UI inspection is authorized.

## Last verified checkpoint and rollback
- Parent: current canonical `work/` Seventeenth source and retained Seventeenth Flight Tester at `outputs/candidates/2026-08-30-prism-3d-camera-seventeenth-final/`.
- Before source mutation, preserve a source archive and SHA-256 manifest under `outputs/rollback/2026-08-30-prism-3d-camera-seventeenth-source/`.
- Protected files and required hashes: `src/renderer/src/App.tsx` `7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2`; `NodeCard.tsx` `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`; `styles.css` `d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27`.

## Scope and owners
- Camera 3D document/model, migrations, recursive scene tree, Shot-owned Camera, persistence/clipboard/history/artifacts/local render.
- Camera viewport transform/deployment/ground constraints and Top/Side Camera manipulation.
- Camera hierarchy, Inspector, menus, timeline selection/trim/playhead/shell, mounted interaction and computed-style coverage.
- Shared active owners reused without redesign: `StoryboardSharedControls`, `NodeCardNext` fluid controls/allocator, production Prism menu anatomy, Camera toolbar separator.
- Isolated Eighteenth app/package identity and output only. Live Prism is protected.

## Persisted data and migration
- Replace optional loose Camera authority and per-Shot `activeCameraId` execution with exactly one Shot-owned Camera state.
- Migrate each Shot from referenced loose Camera, clone shared references per Shot, synthesize defaults for invalid references, remove migrated loose Cameras, and sanitize idempotently.
- Introduce one persisted root scene-tree order and canonical acyclic recursive Groups; migrate legacy per-Shot `entityOrder` and flat `childIds` without duplicate ownership.
- Persist per-object below-canvas permission, linked Scale state where already owned, canonical seconds timing, duplication, undo/redo, clipboard and artifact fingerprints.

## Protected behavior
- Thin rotating wheels; Scale/Anchor semantics; Target modes; movement presets; map rules; local H.264; color rules; direct Block/Sphere/Column editing; scene assets global across Shots.
- No legacy renderer edits. No Camera in generic Add after migration. No scene-asset deletion when deleting a Shot.
- No visual invention: copy the exact named production owners and retain flat dark Prism identity.

## TDD and gates
- Strict vertical RED→GREEN for A–Q, with mounted pointer/computed-style/selection-domain/geometry/accessibility coverage where specified.
- Focused Eighteenth plus Seventeenth tests; affected Eighth–Eighteenth gate with actual runner counts.
- `npm run typecheck`; one fresh Camera production build using `electron.vite.camera.config.ts`.
- Exactly one arm64 `Prism 3D Camera Eighteenth Flight Tester.app` with distinct bundle/product/package/user-data identity.
- Extract ASAR and prove exact source/out-camera parity; deep/strict ad-hoc signature; arm64 identity; protected hashes; FFmpeg byte parity and libx264/libx264rgb; real local H.264 engine proof with Shot-owned Camera and nested transforms.
- Manual visual/interaction acceptance remains Admin/user-owned because launch and physical inspection are explicitly prohibited.

## Cross-domain Eighteenth authority map
- **Object/domain + persistence:** `structuredObject.ts`, `model.ts`, `sceneTree.ts`, `history.ts`, `artifacts.ts`; one root Object identity owns uniform color, root transform/anchor/Scale, leaf lock/allow-below, keys, provenance/version/order, bounded primitive parts, exact world/local detach/create round-trips, one-part dissolution, copy/duplicate, reopen and render parity.
- **Assistant/security boundary:** `structuredObjectAssistant.ts`, `StructuredObjectCreatePanel.tsx`, `Prism3DCameraNode.tsx`, and `src/camera-tester/{api,preload,main,objectAssistantIpc}.ts`; prompt Revamp is text-only and reference-free, Send owns recipe generation, renderer exposes no provider/credential controls, sender/request/reference/response shapes are bounded, and invalid output performs zero document mutation.
- **Viewport/snap/render:** `CameraViewport.tsx`, `threeScene.ts`, `cleanRenderer.ts`, local render client/engine; evaluated bounds, recursive Group/Object transforms, Perspective/Top/Side picker movement, projected anchors, exterior filtering, ground/collision/lock rules and local H.264 parity share evaluated scene authority.
- **Mounted/UI/accessibility:** production shared controls plus Camera hierarchy/Inspector/timeline/menu surfaces; 300/480 Inspector geometry, 1280×800 and 960×640 timeline/workspace geometry, direct-click clip selection, numeric-wheel burst semantics, dual lock icons, hover/focus/disabled/checked states and exact separator/divider/playhead styling require mounted behavior evidence. SSR/source assertions are supporting evidence only.

## A–Q executable coverage ledger
| Contract | Required executable owner/evidence |
|---|---|
| A shared Cut/Continue anatomy + 300/480 geometry | `camera3dSeventeenthMounted.test.ts`, Eighteenth mounted geometry extension |
| B evaluated bounds/allow-below | `camera3dEighteenthModel.test.ts` |
| C direct-click timeline selection | `camera3dEighteenthShotOwnedCamera.test.ts`, mounted timeline extension |
| D timeline shell/separators/divider/playhead | Eighteenth surface support + mounted 1280/960 computed-style extension |
| E Camera movement Perspective/Top/Side | mounted picker-coordinate extension |
| F compact Shot/Camera Inspector/shared controls | mounted 300/480 extension |
| G seconds-owned duration | Eighteenth model + Shot-owned Camera tests |
| H Shot-owned Camera migration | Eighteenth Shot-owned Camera/model tests |
| I root Shot/Camera/global assets | Eighteenth scene-tree/hierarchy tests |
| J recursive acyclic Groups | Eighteenth scene-tree tests |
| K complete Shot/Camera duplication | Eighteenth Shot-owned Camera/model tests |
| L aggregate Location Lock | Eighteenth scene-tree + mounted dual-icon extension |
| M numeric wheel burst/undo/cancel | Seventeenth mounted baseline + Eighteenth burst/cancel extension |
| N divider before pitch | mounted computed-style extension |
| O Scale Link2/Unlink2 semantics | Seventeenth transform behavior + Eighteenth surface tests |
| P truthful accessibility states | mounted accessibility matrix extension |
| Q isolated identity/package/render | Eighteenth surface, IPC, package/static/H.264 gates |
| Structured Object final authority | Eighteenth Object model/render/hierarchy plus group-membership/persistence extensions |
| projected magnetic snapping | Eighteenth Object model plus Perspective/Top/Side/ground/collision/cancel extension |
| Revamp-vs-Send + strict assistant boundary | Eighteenth assistant/UI and camera-tester IPC tests |

## Allowed source surfaces
- `src/camera3d/**`, directly required active shared control/allocator imports or tests, `src/camera-tester/**`, `electron-builder.camera.json`, Eighteenth focused tests, and this impact map.
- Do not modify `src/renderer/src/App.tsx`, `NodeCard.tsx`, or `styles.css`.
