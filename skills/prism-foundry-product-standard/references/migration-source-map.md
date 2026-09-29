# Prism Documentation Migration Source Map

> **Status:** Current migration evidence
> Every imported normative section must have exactly one canonical destination.

Clause-level status and future leaf ownership are audited in `docs/MIGRATION-CLAUSE-MAP.md`; cross-domain legacy-skill routing is audited in `docs/SKILL-SECTION-MAP.md`. Heading-level preservation below is not permission to call mixed inherited clauses Current.

| Source | Section | Canonical destination |
|---|---|---|
| `product-contract.md` | Application structure and regression firewall | `docs/architecture/change-control-and-regression-firewall.md` |
| `product-contract.md` | Product hierarchy | `docs/product/application-map.md` |
| `product-contract.md` | Asset information architecture | `docs/features/asset-library/library-and-semantic-assets.md` |
| `product-contract.md` | Style system | `docs/features/nodes/semantic-assets/style-node.md` |
| `product-contract.md` | Canvas and nodes | `docs/features/nodes/node-system.md` |
| `product-contract.md` | Typed workflow behavior | `docs/features/canvas/typed-workflow-graph.md` |
| `product-contract.md` | Storyboard | `docs/features/nodes/workflow/storyboard/storyboard-node.md` |
| `product-contract.md` | Generation controls and providers | `docs/features/generation/provider-controls.md` |
| `product-contract.md` | Delete behavior | `docs/data/retention-trash-and-deletion.md` |
| `product-contract.md` | Visual and interaction QA | `docs/design/visual-and-interaction-standard.md` |
| `product-contract.md` | Prompt pipeline and shot continuity | `docs/features/generation/prompt-pipeline-and-shot-continuity.md` |
| `product-contract.md` | Flight Tester release gate | `docs/testing/flight-tester-release-gate.md` |
| `SKILL.md` | Implement as a connected system | `docs/architecture/implementation-standards.md` |
| `SKILL.md` | Convert corrections into regression protection | `docs/testing/regression-firewall.md` |
| `SKILL.md` | Enforce visual consistency | `docs/design/visual-and-interaction-standard.md` |
| `SKILL.md` | Verification | `docs/testing/regression-firewall.md` |
| `SKILL.md` | Prompt pipeline and shot continuity | `docs/features/generation/prompt-pipeline-and-shot-continuity.md` |
| `SKILL.md` | Generated media inspection and estimates | `docs/features/generation/inspection-and-estimates.md` |
| `SKILL.md:198-203` | Unheaded selector and discrete-control doctrine | `docs/design/selector-and-discrete-controls.md` |
| `SKILL.md:204` | Unheaded reusable-correction rule | `docs/testing/regression-firewall.md` |

The procedural `When to Use`, `Prerequisites`, `Procedure`, and `Pitfalls` sections remain in the lean skill router. The pre-branch originals are retained in `.hermes/checkpoints/2026-08-20-prism-pre-branch/`.
