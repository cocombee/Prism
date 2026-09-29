# Security Model

> **Status:** Current

- Renderer: context isolated, sandboxed, no Node integration.
- Preload: narrow typed capability bridge.
- Main: validates privileged requests and owns provider credentials/filesystem/network.
- Navigation: new windows denied and top-level navigation constrained.
- Credentials: encrypted with Electron `safeStorage`; restrictive file permissions.
- Files: active-project and managed-root containment, realpath/symlink checks, archive limits.
- Persistence: atomic JSON writes and stale-generation protection.

Threat reviews must cover malicious renderer input, path traversal, symlink escape, archive bombs, credential exposure, provider response handling, stale async commits, and destructive project transitions.
