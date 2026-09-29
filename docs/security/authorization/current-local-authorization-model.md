# Current Local Authorization Model

> **Status:** Current

Prism does not currently implement RBAC or multi-user authorization. Operations are bounded by:

1. macOS user access to the app and local files;
2. preload capability exposure;
3. main-process IPC validation;
4. an active Prism project requirement;
5. project/managed-root path containment;
6. provider API-key permissions, model access, billing, and quotas.

Future accounts, organizations, cloud sharing, roles, entitlements, and server-side authorization require a separate approved architecture and migration plan.
