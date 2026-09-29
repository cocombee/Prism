# Documentation Ownership

> **Status:** Current

| Domain | Canonical branch | Executable authority |
|---|---|---|
| Product intent | `product/` | accepted product tests and user decisions |
| User-visible behavior | `features/` | renderer/shared implementation and tests |
| Visual interaction | `design/` | renderer/CSS and visual QA |
| Runtime boundaries | `architecture/` | main, preload, renderer, shared source |
| APIs | `api/` | `PrismAPI`, IPC registrations, provider adapters |
| Security | `security/` | main-process validation and security tests |
| Schemas/contracts | `contracts/` | TypeScript types, registries, migrations, tests |
| Storage/data | `data/` | persistence implementation and schema tests |
| Verification | `testing/` | Vitest, typecheck, build, physical QA |
| Distribution | `release/` | package scripts, builder config, signed artifacts |
| Structural decisions | `decisions/` | append-only ADRs |

A normative rule has one owner. Other documents link to it rather than copying it.
