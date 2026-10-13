# Prism Foundry Documentation Router

> **Status:** Current

Load only the branches affected by the task. Cross-domain work requires a written impact map before edits.

- Complete branch inventory: `BRANCH-MAP.md`
- [Current implementation state](CURRENT-STATE.md)
- [Documentation ownership](DOCUMENT-OWNERSHIP.md)
- [Prism system and naming](architecture/prism-system-and-naming.md)
- [Approved Prism semantic system scope and naming](product/prism-system-scope-and-naming.md)
- [Approved and in-flight design artifacts](design/approved-artifacts.md)
- [Prism interface and naming design contract](design/prism-interface-and-naming-design-contract.md)
- [Node footer hard contract](design/node-footer-hard-contract.md)
- [Prism project operations and delegation](operations/prism-operations-and-delegation.md)
- [Change-impact template](CHANGE-IMPACT-TEMPLATE.md)
- [Product-contract clause migration map](MIGRATION-CLAUSE-MAP.md)
- [Legacy skill section migration map](SKILL-SECTION-MAP.md)

| Change | Required documents |
|---|---|
| Product behavior | `product/`, affected `features/`, contracts, tests |
| Node or Storyboard | `features/nodes/`, `features/canvas/typed-workflow-graph.md`, contracts, relevant tests |
| Provider/API | `api/`, `security/authentication/`, generation contracts and provider tests |
| Persistence | `architecture/runtime-boundaries.md`, `data/storage-map.md`, schemas, migration tests |
| UI/design | affected feature, `design/`, renderer rules, visual QA |
| Release | `release/`, security gates, packaged-app smoke tests, rollback |

## Non-negotiables

- Storyboard is a node subsystem: `features/nodes/workflow/storyboard/`.
- Current, Required, Proposed, Deferred, Historical statuses must never be conflated.
- Failed attempts never parent new work.
- “Rollback” restores the last verified checkpoint; “Redo” restores that checkpoint before retrying.
- Critical behavior must point to executable source/types/tests.
