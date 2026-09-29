# Prism Change Impact — 3D Camera Seventeenth Flight Tester (2026-08-30)

> Status: In progress — isolated forward patch from verified Sixteenth source; no app lifecycle actions authorized.

## Last verified checkpoint
- Parent: current canonical `work/` tree and isolated Sixteenth Camera source/package identity.
- Protected live Prism files and required SHA-256 values:
  - `src/renderer/src/App.tsx` — `7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2`
  - `src/renderer/src/NodeCard.tsx` — `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`
  - `src/renderer/src/styles.css` — `d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27`
- Sixteenth remains the sole runnable fallback. Failed candidates may inform diagnosis but never parent new work.

## Scope
- In scope: Camera viewport gizmo stability and preview scheduling; exact ShotBoundaryChoice reuse; Inspector scrub wheels and Reset parity; stable Top minimap mapping; rotation-copy removal; Human selection paint; upward timeline resizing and panel separators; viewport-center deployment; isolated Seventeenth identity; mounted and deterministic regressions.
- Out of scope: live Prism source boundaries listed above; provider calls; app launch/stop/install/register/physical inspection; promotion; user acceptance; unrelated Prism behavior.
- Primary allowed implementation files:
  - `src/camera3d/CameraViewport.tsx`
  - `src/camera3d/exactCanvasCamera.tsx`
  - `src/camera3d/Prism3DCameraNode.tsx`
  - `src/camera3d/interaction.ts`
  - `src/camera3d/model.ts` only if deployment semantics require a pure helper
  - `src/camera3d/camera3d.css`
  - new `src/camera3d/camera3dSeventeenth*.test.ts(x)` regressions
  - `src/camera-tester/main.ts`
  - `electron-builder.camera.json`
  - this impact record and rollback/package verification manifests.
- Exact active shared production owners may be imported/reused but not restyled locally: `ShotBoundaryChoice`, `styles-next.css:1792–1797`, shared minimap geometry helpers.

## Dependencies and risks
- Renderer/Three.js: stable selected `Object3D` identity must survive active TransformControls preview; no scene rebuild while a transform gesture owns the object.
- Preview/history: one latest-wins rAF scheduler must serve Inspector scrub, numeric drag, physical drag, and TransformControls without motion-event history writes.
- Minimap: map extents and visible Top viewport bounds are separate owners; viewer zoom/pan changes only the viewport mask unless stable union expansion is required by scene/viewport bounds.
- Timeline: layout state is runtime-only and may not mutate the Camera document/history.
- Packaging: distinct appId/product/package/userData/output identity; arm64 directory package only; no launch.

## Protected behavior
- Target Free/Point/Object, movement preset normalization, Shot-owned Duration, local H.264, grouping, direct surface resize, Camera color and map rules.
- Front/Side/Perspective trajectory map behavior; Side never exposes Top mask.
- Timeline zoom and In/Out controls remain unchanged.
- Explicit drag/drop and explicit context-menu ground positions remain authoritative.
- Gizmo picker reach/hit geometry remains at least Sixteenth size even when visible geometry shrinks.

## TDD and verification
- Strict vertical RED→GREEN for each defect lane; mounted pointer-coordinate coverage for gizmo behavior and mounted geometry/interaction coverage where required.
- Focused Seventeenth plus Sixteenth; affected Eighth–Sixteenth gate; `npm run typecheck`; `npx electron-vite build --config electron.vite.camera.config.ts`.
- Exactly one isolated arm64 Seventeenth package; extract ASAR and prove source/out-camera parity; deep/strict ad-hoc signature; arm64 identity; protected hashes; bundled FFmpeg byte parity and libx264/libx264rgb capabilities; deterministic final-source H.264 preview/render parity.
- No launch, stop, install, registration, or physical inspection. Manual checks remain Admin/user-owned.

## Rollback
- Pre-change archive and SHA-256 manifest are captured before source edits.
- Surgical rollback restores only files listed in that manifest, reruns Sixteenth focused tests and protected hashes, and leaves unrelated files untouched.
