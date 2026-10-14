---
type: operations
project: AI Video
task: Prism
status: current
canonical_path: /Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism
owner: Admin
---

# Prism Project Operations and Delegation

> **Status:** Current operations record
> **Updated:** 2026-08-25
> **Canonical owner:** Admin (`default` profile)
> **Scope:** Hermes project/task structure, artifact organization, current delegation status, and mirror verification only. The stable Hermes routing and identity contract remains [`docs/architecture/prism-system-and-naming.md`](../architecture/prism-system-and-naming.md). This record does not redefine Prism cinematic semantics or authorize software edits.

## 1. Canonical identity

- Hermes project: `AI Video`
- Hermes task: `Prism`
- Canonical folder: `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism`
- Manifest: `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/PROJECT-TASK-MAP.md`
- Existing identity is reused in place. No replacement project, task, chat, or sibling folder was created.
- The project/task map already contains the exact `AI Video -> Prism` entry; the physical folder resolves to the same real path.

## 2. Operational layout

The existing application-task layout remains the authority. The stable routing, identity, and cross-layer naming rules remain in [`docs/architecture/prism-system-and-naming.md`](../architecture/prism-system-and-naming.md); this file records only the current operational snapshot.

- `docs/product/` — stable product and system intent. The approved system specification is promoted to [`prism-system-scope-and-naming.md`](../product/prism-system-scope-and-naming.md).
- `docs/design/` — visual and interaction contracts. [`approved-artifacts.md`](../design/approved-artifacts.md) is the navigation and status index; existing review files remain in their established locations.
- `docs/operations/` — structural, delegation, and current administrative records. This file is the canonical Admin record for this setup.
- `docs/decisions/` — append-only architectural or structural decisions already accepted by the project.
- `context/imports/` — source provenance for the approved specification; raw material is not active authority.
- `status/` and `handoffs/` — software continuity owned by Developer; Admin does not replace their active software objective.
- `work/` and `outputs/` — task-owned implementation and deliverables. They are not copied into Obsidian.

## 3. Ownership and delegated lanes

| Lane | Owner | Kanban card | Responsibility | Current state |
|---|---|---|---|---|
| Cinematic semantics | Director | `t_4649da3b` | Prompt Structure, Attribute Breakdown, glossary, semantic IDs, and the approved system specification | Done; artifact verified by the Director worker |
| Product design | Designer | `t_8c5140bb` | UX hierarchy, visual system, states, naming presentation, annotated flows, and developer-ready design contract; no source edits | Done; canonical contract promoted unchanged under `docs/design/` |
| Software foundation | Developer | `t_030ae39b` | Provider-neutral domain source, schemas, validators, tests, build, package, and headless workspace model | Done as an isolated candidate package; 34 tests, typecheck, build, and package dry-run passed; not yet integrated into canonical `work/` |
| Hermes administration | Admin (`default`) | `t_18355065` | Canonical folder and manifest, document placement, provenance, naming convention, Drive/Obsidian projection, and delegation | Done; structure and initial projection verified |
| Integration routing | Root task | `t_3e31ffd9` | Reconcile child outcomes without adding a competing source writer | Reconciled; canonical application integration remains a new Developer lane followed by bounded Designer review |
| Physical UI action | Mechanic | No owning card | One explicitly bounded click/type action only, then return evidence and stop | Not invoked by this setup |

Designer and Developer remain separate writers: Designer owns design artifacts; Developer is the sole software source writer. Admin owns structure and mirrors but does not modify software. No additional Admin child card was created because the remaining non-software work is the current card's bounded scope and `default` is the Admin owner.

## 4. Naming convention

### Hermes identity

- Human-facing project and task folders use readable Title Case and preserve technical proper nouns.
- The active pair is exactly `AI Video/Prism`; artifacts do not become new Hermes projects or task folders merely because they have a separate domain.
- Existing task and project IDs are preserved. A new card or artifact must not create a replacement identity to cross a profile boundary.

### Kanban work cards

Future Prism cards use:

`Prism — <Area> — <Action> <Object>`

Allowed area labels are `Semantics`, `Design`, `Software`, `Admin`, and `Integration`. Existing cards and IDs are retained as-is; this convention applies to new cards and does not justify renaming historical work.

### Artifact and domain names

- New documentation files use lowercase kebab-case; historical filenames remain in place unless a separate rename is approved.
- Stable knowledge IDs use `<branch>.<family>.<semantic-slug>`, with branch exactly `ps` or `ab`; IDs are lowercase ASCII and do not contain versions, provider names, filenames, or UI labels.
- Code types use PascalCase, JSON fields use `snake_case`, enum values use lowercase `snake_case`, events use lowercase kebab-case, and diagnostics use `PRISM_<AREA>_<CONDITION>`.
- Versions remain separate fields. Stable IDs and task identity do not encode dates or revisions.

The complete semantic naming contract is [`prism-system-scope-and-naming.md`](../product/prism-system-scope-and-naming.md); this operations record only applies it to project administration and delegated work.

## 5. Approved and in-flight artifacts

| Artifact | Canonical location | Authority/status |
|---|---|---|
| Prism system scope and naming specification | `docs/product/prism-system-scope-and-naming.md` | Promoted unchanged from Director artifact `t_4649da3b`; SHA-256 `b42910e5a7c4a53f801e842adebf6f74fad15908e16db07beb0c9164795ee182` |
| Source provenance copy | `context/imports/prism-system-scope-and-naming-2026-08-25/PRISM_SYSTEM_SCOPE_AND_NAMING.md` | Raw approved attachment; provenance only; exact-byte copy |
| Design artifact registry | `docs/design/approved-artifacts.md` | Current index; separates build authorization from final visual/user acceptance |
| Existing design contracts and reviews | `docs/design/` and `docs/design/reviews/` | Indexed with their exact current verdicts; no blocked or unverified review is promoted to final approval |
| New Designer contract | `docs/design/prism-interface-and-naming-design-contract.md` | Developer-ready contract promoted unchanged from `t_8c5140bb`; rendered/user acceptance remains open |
| Isolated semantic foundation | Kanban workspace/attachments of `t_030ae39b` | Verified candidate package only; not canonical Prism application source until Developer integrates it under `work/` |

## 6. Routed follow-up work

1. **Canonical software integration (`t_2359c78b`)** — Developer must integrate the verified semantic foundation into the existing Prism Foundry application under `work/`, reconcile it with current source and persistence boundaries, implement the approved interface contract, and return one stable tested/buildable candidate. The isolated scratch package is input evidence, not a directory to copy wholesale.
2. **Bounded design review (`t_9b5b7c53`)** — Designer reviews the stable integrated snapshot after `t_2359c78b` against `docs/design/prism-interface-and-naming-design-contract.md` without editing source and returns one consolidated finding batch or approval.
3. **Physical tester acceptance** — Final rendered/user acceptance remains user-owned unless explicitly delegated. No existing generation, credential, provider transport, or billing behavior is reclassified as Prism semantic compilation.
4. **No path/ownership mismatch** — The manifest and physical `AI Video/Prism` mapping remain aligned; no move or rename is pending.

## 7. Verification record

- Parent specification validation reported zero bad knowledge IDs, duplicate headings, missing required sections, and unresolved placeholders; seven knowledge IDs were checked.
- Source attachment and both promoted/provenance copies are required to share SHA-256 `b42910e5a7c4a53f801e842adebf6f74fad15908e16db07beb0c9164795ee182`.
- A pre-write backup is retained at `backups/kanban-t_18355065-20260825-082744/`.
- Obsidian is a readable projection, not an authority. The task-scoped sync must report verified hashes and zero graph orphans before this setup is called synchronized.

## 8. Developer and Designer path/link-back contract

The current path and names are fixed for this Prism work:

- Hermes identity: `AI Video → Prism`
- Canonical folder: `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism`
- Product identity: `Prism Foundry`
- Manifest: `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/PROJECT-TASK-MAP.md`
- Stable routing record: `docs/architecture/prism-system-and-naming.md`
- Admin operations record: `docs/operations/prism-operations-and-delegation.md`

The Kanban scratch directories for `t_030ae39b` and `t_8c5140bb` are temporary worker locations only. They are not new project/task folders and must not be used as durable source links. Developer links implementation continuity back to the canonical task's `work/`, `status/`, and `handoffs/` areas. Designer links design decisions and acceptance back to the canonical task's `docs/design/` registry and the approved design-contract artifact on `t_8c5140bb`. Neither lane creates a replacement Prism task or sibling folder.

When Admin approves a path or human-facing folder-name change, Admin is the first writer: update the manifest, `.hermes.md`, this operations record, task-local links, and the existing Obsidian projection, then verify the new mapping. Developer must audit source identifiers, persisted data, package/bundle identity, tests, and other code references before using the new name. Designer must review any visible product name or presentation change. Both lanes link back to the existing `AI Video → Prism` identity and current records rather than retaining stale absolute paths or copying into a second folder.
