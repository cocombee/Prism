# Prism Change Impact — 3D Camera Complete Repair (2026-08-30)

> Status: Authorized complete correction from rejected Eighteenth source. No app lifecycle actions.

## Parent and protected boundary
- Parent: current canonical `work/` tree with Seventeenth rollback source archive as the last correctly working Camera/Shot design reference.
- Preserve byte-exact legacy files: `src/renderer/src/App.tsx` `7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2`; `NodeCard.tsx` `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`; `styles.css` `d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27`.
- No launch, close, install, registration, replacement, credential access, paid provider call, or user-project mutation.

## Recovery mapping: rejected Eighteenth → approved authority
- `model.ts`: retain one persisted Camera state inside each Shot, but restore deployable Camera semantics: deploying Camera creates the complete Camera/Shot/clip unit; deleting/duplicating operates on that unit; editor View remains navigation only.
- `Prism3DCameraNode.tsx` + `CameraSceneHierarchy.tsx`: replace Camera-less Shot presentation with one Camera/Shot row that selects and edits the Shot-owned Camera; restore Add Camera; retain root/sibling scene assets and recursive Groups.
- `exactCanvasCamera.tsx`: retain the established Seventeenth Shot menu shell and commands; remove the invented FluidControlGroup “SHOT SETTINGS” arrangement; integrate the prior Shot fields beneath the complete Camera Transform/Optics controls. Visible clip selection remains direct-click-only and clears outside.
- `camera3d.css` + timeline markup: remove every separator above the Shot lane; render exactly one square divider between Shot and expanded property rows; replace split ruler/track playheads with one continuous overlay.
- `StructuredObjectCreatePanel.tsx`: delete the rejected centered `Custom 3D Object` invention and reuse the active generatable Asset Creation owners/classes/anatomy, omitting only Sheets/Single/Multi and dependent options. Keep prompt required and one optional reference.
- `CameraViewport.tsx` + `interaction.ts`: restore four-direction Top/Side Camera movement and orthographic zoom; editor views never become render Camera authority.
- Numeric controls: add same-frame field+asset preview, one release commit, and exact pointercancel/Escape restoration.
- Existing Eighteenth tests that require no Add Camera, Camera-less Shot UI, split playheads, or the invented Custom 3D Object modal are rejected and will be corrected.

## Allowed files
- `src/camera3d/**`, `src/camera-tester/**`, `electron-builder.camera.json`, `electron.vite.camera.config.ts`, focused Camera tests, this impact record.
- Active production generatable Asset Creation source/CSS may be imported/reused but not independently redesigned.

## Vertical TDD and verification
- One RED→GREEN slice per corrected ownership, selection, timeline, hierarchy/lock, object-creation, orthographic, and numeric-interaction behavior.
- Mounted physical Electron interactions for every reported failure and affected Eighth-forward regressions.
- Affected tests, typecheck, one fresh Camera build, one isolated arm64 package, exact ASAR/out parity, strict ad-hoc signing, arm64 identity, protected hashes, bundled FFmpeg identity/capabilities, and durable real H.264 proof.
