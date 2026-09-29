# Prism Change Impact — 3D Camera Eighth Visual/Control Recovery (2026-08-29)

> Status: implementation in progress; user visual acceptance remains external.

## Last verified behavioral oracle
- Verified sixth packaged app: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/retained-builds/3d-camera/last-safe/Prism 3D Camera Flight Tester.app`.
- Sixth packaged `app.asar` SHA-256: `83976cee02988725e8d3f0f558241fcf56c3fa2c58101a7ca332c2d829459245`.
- Sixth bundle identifier: `com.cocombees.prismfoundry.3dcamera.sixth-alignment-correction.20260829`; product `Prism 3D Camera Flight Tester`; thin arm64.
- Failed seventh source checkpoint is diagnostic only: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/checkpoints/2026-08-29-3d-camera-failed-seventh-source`.
- Byte comparison proved the current camera/config files exactly match the failed seventh checkpoint before this recovery.
- Surgical pre-change archive: `/tmp/prism-3d-camera-eighth-prechange-20260829.tgz`; SHA-256 `1c69d0b53c19c2508a2094e380b1b4230688ade5370c182349cb7581606a9d63`.

## Scope
- Remove all 3D tester generation/render surfaces and make `camera:begin-render` unreachable from renderer UI.
- Replace permanent local XYZ manipulation with direct view-plane pointer movement; preserve optional contextual rotation and settled Block/Sphere surface sizing.
- Make base/current transforms authoritative until an explicit diamond authors a keyframe; draft numeric input and bounded relative fine sliders.
- Reuse byte-faithful Prism Inspector, page-strip/tab, context-menu, minimap frame/navigation anatomy and final CSS owners.
- Make right-click target-specific and every row functional.
- Preserve four-item catalog, voxel Human, Camera geometry/path/frustum/no-resize, lock/lens, smooth navigation, Shots/Cut/Continue, compact node, isolated tester, and no provider/live registration.

## Files allowed to change
- `src/camera3d/CameraViewport.tsx`
- `src/camera3d/Prism3DCameraNode.tsx`
- `src/camera3d/exactCanvasCamera.tsx`
- `src/camera3d/model.ts`
- `src/camera3d/interaction.ts` only if a pure view-plane movement helper is needed
- `src/camera3d/camera3d.css`
- focused camera tests, including a new eighth mounted/interaction suite
- camera tester identity/config files and this impact map
- shared minimap extraction only if the production Canvas output remains unchanged

## Protected files and behavior
- Do not modify legacy `src/renderer/src/App.tsx`, `NodeCard.tsx`, or `styles.css`.
- Do not alter production Canvas visual output or shared provider/request behavior.
- No paid provider call, credential access, installed-app replacement, launch, or user-data reuse.
- Failed seventh source/package never parents the recovery; it is used only to enumerate and remove seventh-only seams.

## RED-capable gate
- Mounted browser/DOM interaction tests at 1280×800 and 960×640 for timeline/no-generation/map bounds and computed Prism role parity.
- Pointer-coordinate target matrix and direct 3–10px movement semantics.
- Draft numeric input and bounded fine slider semantics.
- Explicit keyframe/Ease behavior and complete Camera no-resize reachability.
- Map content/wedge/clipping/interaction callback.

## Final gate and package
- Focused camera tests plus affected neighbours, `npm run typecheck`, then one `npm run build -- --config electron.vite.camera.config.ts` production build.
- Package exactly `/tmp/prism-3d-camera-eighth-visual-recovery-20260829/mac-arm64/Prism 3D Camera Flight Tester.app` with unique bundle/userData identity, thin arm64, local ad-hoc deep/strict signature.
- Do not launch. Report hash, identity, signature, exact changed/reverted seams, and manual Mechanic controls without claiming visual acceptance.
