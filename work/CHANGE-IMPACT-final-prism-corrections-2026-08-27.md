# Final Prism correction batch — change impact

## Last verified checkpoint
- Checkpoint: current canonical `work/` source; promoted production evidence is documented in `../docs/CURRENT-STATE.md`.
- Protected baseline SHA-256: `App.tsx` 7dbb9030d35cc86c78ef936719e502d30125a7fa1b0b510a355f7c8f9028a6e2; `NodeCard.tsx` 2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79; `styles.css` d87fa24d031e5bca6fe6c2e60166bacfed8911e49cccf0cb15fe4d963d5a3c27.
- Existing running tester is protected and must remain untouched: `/tmp/prism-shared-image-semantic-controls-final-tester-20260826/mac-arm64/Prism Flight Tester.app`.

## Scope
- In scope: canonical PNG/JPEG/WebP casing; shared Image/semantic `FluidControlGroup`; non-contiguous balanced allocation; real mounted geometry; reusable thumbnail/sole-preview synchronization; local-only reusable asset generation prompt boundary; focused tests, one typecheck/build, isolated arm64 package and static readback.
- Out of scope: app launch/restart/quit, user/provider data, provider calls, media POST, full suite/audit, protected legacy renderer, schema migration beyond backward-compatible field hydration.
- Allowed production files: successor renderer/shared/main/preload files only where exact ownership is proven; package configuration only through command-line packaging overrides. Tests and this impact record may change.

## Dependencies
- Feature/node: Image Generator; Character/Wardrobe/Element/Style/Location reusable assets; Storyboard/Video downstream prompt compilation.
- Runtime: renderer state and pure shared request compilation; no live IPC/provider execution.
- Contract/data: backward-compatible optional `assetGenerationPrompt`; legacy `prompt` remains readable only as local-generation hydration fallback and is excluded from downstream semantic authority.
- Design: selector/discrete controls and whole-group fluid-control contracts.

## Protected behavior
- Preserve all accepted prior fixes, exact component anatomy, Run/Settings/Save behavior, reference identity/tag/approved metadata/media, Storyboard and Video authored prompts, built-in Style authority, and legacy project readability.
- Protect `src/renderer/src/App.tsx`, `src/renderer/src/NodeCard.tsx`, and `src/renderer/src/styles.css` byte-for-byte.

## Migration and rollback
- Data change: optional field only; old reusable prompts hydrate locally without rewriting separate downstream authored prompts.
- Rollback set: only files reported in the final changed-file list; candidate package is isolated under `/tmp`.

## Verification
- Strict focused RED→GREEN for casing/layout, mounted thumbnail selection, and sentinel prompt boundary.
- Focused affected + neighboring Vitest only, then `npm run typecheck`, `npm run build` once.
- Signing-disabled arm64 package; ASAR/out parity, Mach-O architecture, SHA-256, protected hashes, and bounded packaged DOM/request readback only. No app opening.
