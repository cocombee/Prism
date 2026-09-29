# Change Impact — Storyboard Camera Bridge Core — 2026-08-23

> **Status:** Core Tasks 1–5 only; renderer integration/build/package explicitly deferred.

## Scope
- Freeze shared compiler behavior with RED tests.
- Add executable shot FOV metadata.
- Add a pure deterministic Continue camera-bridge planner.
- Compile cumulative timing and bridge structure through workflow resolution and Seedance shot specification.
- Add prompt ownership/source/fingerprint contracts and migration helpers at shared seams.

## Boundaries
- No active renderer, CSS, product-surface, Designer, main/preload, provider, build, package, or UI changes.
- Compiled master prompt remains derived, never persisted as authority.
- Blank panels and unknown camera/FOV block compilation rather than inventing action or movement.
- Manual prompt restoration on disconnect is the accepted ownership default.

## Verification
- Strict tracer-bullet RED→GREEN shared tests.
- Focused shared regression gate and TypeScript.
- Manifest: `/tmp/prism-camera-bridge-core-preintegration.json`.
