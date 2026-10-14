---
title: Prism System and Naming
status: Current
owner: Admin
canonical_project: AI Video
canonical_task: Prism
---

# Prism System and Naming

This is the canonical routing and naming contract for Prism as a Hermes-managed software product. It keeps Prism's existing identity stable while separating administration, software implementation, and visible design authority.

## Stable identities

| Layer | Canonical name or path | Rule |
|---|---|---|
| Hermes project/task | `AI Video → Prism` | Keep the existing project/task identity and do not create a replacement task. |
| Hermes task root | `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism` | The Google Drive-synced Hermes tree is authoritative. |
| Product and app name | `Prism Foundry` | Use for the visible product, runtime app, package product name, and product documentation. |
| Bundle identity | `com.cocombees.prismfoundry` | Preserve unless a separately approved migration explicitly changes user-data identity. |
| User-testing candidate | `Prism Flight Tester` | A temporary candidate label only; it is not the promoted product identity or a new project. |
| Reusable logical asset names | lowercase words joined by single dashes | The leading `@` is reserved for a Canvas tag; cards, metadata, rename fields, and exports omit it. |

`Prism` is the Hermes project/task namespace. `Prism Foundry` is the product identity. `Prism Flight Tester` identifies a temporary test artifact only. Do not interchange these names, rename the project merely to improve a category label, or treat a candidate artifact as a new product.

## Ownership and routing

| Work | Owner | Required collaboration |
|---|---|---|
| General assistance, Hermes lifecycle, project/task structure, Google Drive, Obsidian, file/folder naming, and cross-layer coordination | Admin | Admin integrates and makes the final routing/completion claim. |
| Prism or other app/website/software architecture, source changes, persistence, APIs, debugging, tests, builds, packaging, and software continuity | Developer | Developer is the sole source-code writer. |
| Prism or other visible UI/UX, spacing, layout, typography, color, components, interaction, responsive/accessibility presentation, graphics, branding, and visible product naming | Designer | Designer sets a pre-code brief/contract and performs read-only stable-snapshot acceptance; Developer implements. |
| Cinematic prompt and Seedance directing analysis | Director | Admin routes this specialized work; Director does not own Prism source code. |
| One explicit physical desktop action | Mechanic | Admin, Developer, or Designer may invoke Mechanic for one bounded action; Mechanic never owns the task or switches profiles. |

For ordinary non-Prism or non-software work, Admin remains accountable and either handles it or delegates it to the appropriate specialist. Profile routing uses the Desktop profile rail or `hermes -p <profile>`; never use `@profile` mention routing.

## Prism software workflow

1. Admin identifies the existing Prism task and freezes the exact objective, source boundary, and acceptance criteria.
2. If the work changes source architecture, data, providers, persistence, tests, builds, or packaging, Admin routes the implementation phase to Developer and reuses the existing canonical Prism task.
3. If the work changes anything visible or interactive, Designer defines the design contract before code and reviews one stable implementation snapshot. Designer and Developer never write the same source concurrently.
4. Developer implements the approved contract, runs focused regressions and the required software gates, and returns evidence to Admin.
5. Admin integrates the result with the task-local documentation, structural mapping, and final cross-layer verification. User-owned rendered acceptance remains separate from automated evidence.

## Cross-layer naming or rename gate

A product, package, code, persisted-data, UI, or task rename is not a category-only edit. Before changing a name:

1. State the exact target name, aliases, and whether the Hermes project/task identity remains `AI Video → Prism`.
2. Map every affected layer: source identifiers/imports, persisted schemas and migrations, package metadata and bundle identity, visible UI/branding, documentation, task paths, skills, automations, and Obsidian links.
3. Back up the affected canonical files and preserve the current working app and rollback checkpoint.
4. Designer approves visible naming and presentation when the change is user-facing.
5. Developer audits and updates code, data, package metadata, and tests; no silent retry or fallback is allowed for ambiguous state.
6. Admin updates Hermes structure, task-local documentation, links, and the existing Obsidian projection without creating duplicate projects/tasks.
7. Verify focused behavior, typecheck/build/package gates when source changed, exact path and bundle identity, stale-reference cleanup, and user acceptance where required.

If the target name is not explicit, preserve the stable names above and record a proposal instead of mutating source, package identity, or the Hermes project/task path.

## Non-negotiables

- Preserve the existing Prism project/task identity and canonical path.
- Do not create a replacement Developer or Designer project/task for Prism.
- Admin does not write Prism source code; Designer does not compete as a source writer.
- A profile description, child-agent report, ledger entry, or queued handoff is not proof of an external side effect; verify the destination and exact result.
- Treat canonical Hermes completion and Obsidian mirror status separately. Never claim cross-layer synchronization until the mirror hash and graph checks pass.
- Keep unrelated cleanup, taxonomy changes, and speculative renames out of the Prism implementation critical path.
