# Prism Foundry

Current Hermes-managed source for the local-first macOS AI workflow application.

The implementation is in `work/`. Start with `AGENTS.md`, `docs/README.md`, and the task-local product standard before making changes.

## Development

From the repository root:

```sh
cd work
npm ci
npm run dev
```

Useful commands inside `work/`:

```sh
npm run build
npm run typecheck
npm test
```

The main app uses `electron.vite.config.ts`. The separate 3D camera flight tester uses `electron.vite.camera.config.ts`; its newest experiments are not integrated into the main app.

Dependencies, generated builds, installed apps, local credentials, caches, and historical binary backups are excluded from Git. Configure provider credentials locally through the application.

The project is private and its source license remains `UNLICENSED`.
