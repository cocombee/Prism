# System Overview

> **Status:** Current

```text
User → React renderer → typed preload/IPC → Electron main
                                      ├→ local projects/assets/history
                                      ├→ encrypted provider credentials
                                      ├→ fal.ai and direct provider APIs
                                      └→ managed local media protocol
Renderer ↔ shared graph/domain contracts ↔ main provider assembly
```

## Principal subsystems

1. Application launcher, project lifecycle, home/library, canvas, settings/connections, history, and media viewer.
2. Typed node graph with semantic, workflow, generator, output, and utility nodes.
3. Local persistence for project manifests, workflow documents, managed assets, history, portable `.prismflow` and `.prismasset` formats.
4. Provider connection, capability discovery, billing/account state, generation, download, cancellation, and history.
5. Test and release pipeline using Vitest, TypeScript, electron-vite, electron-builder, and physical packaged-app QA.

Source anchors: `src/main/index.ts`, `src/preload/index.ts`, `src/renderer/src/App.tsx`, `src/shared/types.ts`.
