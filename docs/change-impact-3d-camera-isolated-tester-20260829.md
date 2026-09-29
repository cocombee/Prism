# Prism Change Impact — Isolated 3D Camera Node + Flight Tester (2026-08-29)

> Status: authorized implementation in progress. Isolated tester only; no live Prism registration or promotion.

## Last verified checkpoint
- Canonical source: `work/`; promoted runtime and rollback remain those in `docs/CURRENT-STATE.md`.
- Pre-change rollback archive: `/tmp/prism-3d-camera-prechange-20260829.tgz`, SHA-256 `102b76be40a2ffcb0c2edf3aa245a0e44736dbb8dd47a0fe6c817ada141e482d`.
- Protected legacy hashes: App.tsx `7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2`; NodeCard.tsx `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`; styles.css `d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27`.

## Scope and allowed writes
- Bounded `src/camera3d/` component/model/evaluator/viewport modules, CSS, and focused tests.
- Isolated `src/camera-tester/` identity/config only where required for the replacement tester.
- Extract the active AppNext React Flow Zoom In/Zoom Out/Fit View markup into one shared `CanvasNavigationControls` owner and reuse it from both AppNext and the expanded 3D workspace; callbacks only differ. Preserve the final active `.react-flow__controls` and `.react-flow__controls-button` CSS owner.
- Implement the authorized second correction: compact-node boundary, sidebar hit ownership, canonical transform/keyframe commits, dolly/fit/focus/view controls, four-kind migration, rigid voxel Human, direct Block/Sphere dimensions, and Camera assembly/target/path/evaluator identity.
- No live `NodeKind`, `nodeTypes`, palette/menu/search/starter, central port, Storyboard behavior, provider, account, credential, or live project-state mutation.

## Protected behavior and files
- `src/renderer/src/App.tsx`, `NodeCard.tsx`, `styles.css` byte-exact.
- Live successor registries, graph ports, Storyboard behavior/catalog values, provider boundaries, and current running Prism process/data unchanged.
- No Storyboard input and no production promotion.

## Architecture boundaries
- Pure shared scene/frame evaluator owns Play and Render sampling.
- Renderer owns authoring/UI/WebGL; isolated preload exposes narrowly typed save/render/reveal/delete calls; isolated main owns managed tester storage, atomic writes, ffmpeg invocation, validation, and path secrecy.
- Distinct app ID/product/userData and package output under `/tmp/prism-3d-camera-single-node-tester-20260828/`.

## Verification
- Strict focused RED→GREEN tests for required semantic, isolation, evaluator, render, artifact, pointer/selection, and leakage contracts.
- Focused tests, TypeScript, isolated production build/package, arm64, ad-hoc deep/strict signature, ASAR parity/hash, protected hashes and live-registry/catalog checks.
- Open exact isolated app once without replacing or inspecting the current Prism runtime; user owns visual acceptance.

## Rollback
- Delete new isolated files and restore only `UtilityNodes.tsx`, `package.json`, and `package-lock.json` from the pre-change archive. Preserve unrelated current-tree work. Re-run focused boundary tests and protected hashes.
