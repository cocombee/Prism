# Prism 3D Camera Thirteenth Production Local Render — Change Impact

## Checkpoint and rollback
- Parent: existing verified twelfth Camera worktree; no Git repository.
- Preserve all accepted twelfth behavior and the existing twelfth package.
- Create a surgical pre-change archive and manifest under `/tmp` before source edits; failed candidates never parent later work.

## Scope and boundaries
- Implement the frozen Designer contract at `/tmp/designer-prism-3d-eighth-typography-map-audit.md:880-1014` exactly.
- Add Camera-node UI-only In/Out marks, range lane/menu/shortcuts/status, thin Camera sliders, a separate offscreen clean Three.js render owner, bounded context-isolated renderer/preload/main IPC, bundled `ffmpeg-static` H.264 encoding, atomic media validation/promotion, cancellation/failure cleanup, progress, and persisted artifact metadata.
- No provider/API/network/service, fixture-only completion, fake progress, base64-frame persistence, arbitrary renderer-controlled paths/arguments, live CameraViewport capture/resize/animation, app launch/install/promotion, current app/PID control, user-data mutation, or visual acceptance claim.

## Allowed surfaces
- `src/camera3d/`: range/model/artifact/render owner, active Camera node/timeline/CSS, focused tests.
- `src/camera-tester/`: typed API, preload, main render lifecycle, media locator, production smoke harness/tests.
- `electron.vite.camera.config.ts` and `electron-builder.camera.json` only as required for the production renderer/package and unpacked FFmpeg.
- This impact map.

## Protected
- All accepted twelfth map, timeline, compact gallery/output, transforms, camera editing, playback, and persistence behavior.
- `src/renderer/src/App.tsx`, `src/renderer/src/NodeCard.tsx`, and `src/renderer/src/styles.css` remain byte-identical.
- Do not modify legacy owners merely for shared-type exhaustiveness.
- User owns final visual checks at 1280/960 and standard/short height.

## Data/security/lifecycle
- Freeze sanitized `CameraDocument`, exact fps/dimensions/range/scope/fingerprint at invocation.
- Main validates job/node/artifact identity, dimensions, frame count, frame index/order, and byte limits; only fixed bundled-FFmpeg argv is used via `spawn` without shell.
- Encode in an app-owned job directory beneath Camera media root, validate local MP4 metadata/nonzero bytes, SHA-256, atomically rename to `cameraMediaFile`, and only then promote the renderer artifact state.
- Cancel/error/sender destruction/window close/app shutdown terminate FFmpeg, close input, and remove temp/partial output. Cancellation is idempotent; prior valid artifacts remain intact.
- Persist marks as Camera node UI state only; exclude them from history and source fingerprint. Sanitize obsolete artifact scope `shot` to `marked-range` safely.

## Verification
- Strict vertical RED→GREEN for range, shortcuts/guards/crossing/clamping/persistence, IPC lifecycle, real H.264 smoke, cancellation, forced failure, artifact metadata/promotion/hydration, multi-Shot active Camera/cut, and thin CSS.
- Keep the existing focused 117-test gate green plus all new tests; run TypeScript and one final Camera production build.
- Run a real short production-engine render through a bounded internal test-only dimension seam; probe codec/pixel format/dimensions/fps/frame count/duration/audio/SHA-256.
- Package once with `electron-builder.camera.json`; verify final `out-camera` ASAR parity, unpacked executable FFmpeg, deep+strict ad-hoc signature, arm64 identity/executable, candidate hashes, and protected hashes. Do not launch or install.
