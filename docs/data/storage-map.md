# Storage Map

> **Status:** Current

| Store | Purpose |
|---|---|
| Electron `userData/studio-data` | current/recent project pointers, non-secret service profile registry, and encrypted provider credentials |
| `studio-data/service-profiles/<provider>/<profile-id>.enc` | one `safeStorage` ciphertext per provider profile |
| project root | Prism project manifest and owned media |
| `00. Project/*.prismflow` | portable editable project document |
| `05. Canvas/workflow.json` | canonical workflow state |
| `05. Canvas/assets.json` | project asset index |
| `05. Canvas/history.json` | generation history |
| global styles store | reusable Style assets |
| `.prismasset` | portable bounded asset archive |

Writes that replace canonical JSON must be atomic. Schema changes require versioning, migration tests, backup/restore proof, and downgrade/rollback decisions.

Project manifests and portable `.prismflow` documents may persist `serviceProfileOverrides` containing opaque profile IDs. Projects without an override follow the current global default; credentials never enter project storage.
