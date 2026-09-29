# Internal Prism API

> **Status:** Current

The preload bridge exposes these domains: projects, credentials, services, workflows, assets, assistant, generation, history, and experiments.

Canonical executable definitions:

- Interface: `src/shared/types.ts` (`PrismAPI`)
- Renderer bridge: `src/preload/index.ts`
- Main handlers: `src/main/index.ts` (`registerIpc`)

Every method requires a one-to-one typed interface entry, preload invocation, registered main handler, argument validation, authorization checks where privileged, and regression coverage. Generated channel-registry validation should prevent undocumented or orphaned IPC methods.

The services domain includes fal.ai profile list/refresh, add/sign-in, disconnect/reconnect/sign-out/delete, rename, default selection, and per-project selection. Renderer responses contain profile metadata only. Generation resolves project override versus global default and decrypts the selected profile entirely in the main process.
