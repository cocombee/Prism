# Legacy Skill Section Migration Map

> **Status:** Current migration evidence
> **Purpose:** Track cross-domain routing and protected regression doctrine from the pre-branch skill, including its formerly unheaded rule block.

| Source section | Lines | Canonical target | Cross-domain routing |
|---|---:|---|---|
| Frontmatter + `# Prism Foundry Product Standard` | 1–18 | `skills/prism-foundry-product-standard/SKILL.md` | Retain only identity, brief product stance, and selective-loading role. Product vision belongs in `docs/product/vision-and-principles.md`. |
| `## When to Use` | 19–24 | `skills/prism-foundry-product-standard/SKILL.md` | Keep as the router trigger; link work types to the selective-load matrix in `docs/README.md`. |
| `## Prerequisites` | 25–30 | `skills/prism-foundry-product-standard/SKILL.md` | Workspace/task identity rules also belong in root `AGENTS.md`; impact-map prerequisite belongs in `docs/CHANGE-IMPACT-TEMPLATE.md`. |
| `## Procedure` | 31–40 | `skills/prism-foundry-product-standard/SKILL.md` | Keep only concise routing procedure. Canonical ownership/read-before-edit rules belong in `docs/DOCUMENT-OWNERSHIP.md`; preservation and rollback rules in `docs/CHANGE-IMPACT-TEMPLATE.md`. Machine-local paths should not migrate into product docs. |
| `## Implement as a connected system` | 41–75 | **Primary:** `docs/features/generation/request-assembly.md` | Highly cross-domain; must be split. Prompt compilation → `features/generation/prompt-compilation.md`; typed graph/ports → `features/canvas/typed-connections.md` and `contracts/node-port-and-signal-contract.md`; provider capabilities/billing → `api/providers/*`; credentials → `security/authentication/*`; persistence/autosave → `architecture/project-persistence.md` and `features/autosave-and-recovery/*`; assets/rename/delete → `features/asset-library/*`; individual node rules → corresponding `features/nodes/**` documents. |
| `## Convert corrections into regression protection` | 77–89 | `docs/testing/regression-matrix.md` | Impact mapping and ownership boundaries → `docs/CHANGE-IMPACT-TEMPLATE.md` and `docs/DOCUMENT-OWNERSHIP.md`; verification escalation → `testing/strategy.md`; build/package gates → `release/release-gates.md`. |
| `### Learned design-and-test doctrine` | 90–99 | `docs/testing/visual-and-interaction-qa.md` | Optical/layout standards link to `design/*`; provider-effective audits link to `testing/request-audits.md`; master ledger remains in `testing/regression-matrix.md`. |
| `## Enforce visual consistency` | 100–179 | **Primary:** `docs/design/design-system.md` | Largest cross-domain block and unsafe to move intact. Palette/type/spacing/icons/tooltips/selectors → `design/*`; shell responsiveness → `design/application-shell.md`; canvas controls/guides/viewport → `features/canvas/*` plus `design/canvas-interactions.md`; node anatomy/run states/ports → `features/nodes/*` plus `design/node-card-anatomy.md`; reusable assets → `features/asset-library/*` and semantic-node files; Storyboard → `features/nodes/workflow/storyboard/*`; provider/model controls → node-specific generator docs and `api/providers/capability-matrix.md`; hydration/autosave behavior → `features/autosave-and-recovery/*`. Line 179 belongs specifically to `features/nodes/semantic-assets/character-node.md`. |
| `## Pitfalls` | 181–187 | `docs/testing/strategy.md` | Flight Tester requirement → `testing/packaged-app-smoke-tests.md`; no-credit audits → `testing/request-audits.md`; release/DMG prohibition → `release/release-gates.md`. A short warning summary may remain in the router skill. |
| `## Verification` | 188–197 | `docs/release/release-gates.md` | Typecheck/tests → `testing/strategy.md`; packaged interaction checks → `testing/packaged-app-smoke-tests.md` and `testing/visual-and-interaction-qa.md`; signing/notarization → `release/signing-and-notarization.md`; user-deliverable rules → `release/macos-dmg-packaging.md`. |
| **Unheaded selector/doctrine block** | 198–204 | `docs/design/panels-modals-and-menus.md` | Selector pixel arithmetic and spinner replacement belong with shared selector design; reusable-correction rule belongs in `testing/regression-matrix.md` and `DOCUMENT-OWNERSHIP.md`. This block should receive a heading before migration so it cannot be dropped. |
| `## Prompt pipeline and shot continuity` | 206–212 | `docs/features/generation/prompt-compilation.md` | Storyboard traversal/recipes → `features/nodes/workflow/storyboard/provider-shot-contract.md`; serial sequence behavior → `features/generation/generation-lifecycle.md`; variant experiments → `features/generation/history-and-experiments.md`; managed final frames → `architecture/managed-asset-lifecycle.md`. |
| `## Generated media inspection and estimates` | 213–219 | **Primary:** `docs/features/application-shell/media-viewer.md` | Generated-result retention/history → `features/generation/history-and-experiments.md`; rename/delete/file lifecycle → `features/asset-library/rename-delete-and-deployment.md` and `data/retention-trash-and-deletion.md`; cost estimation → `features/generation/pricing-and-estimates.md`; countdown estimation → `features/generation/progress-cancellation-and-stale-results.md`. |

## Protected regression rules that must survive migration

These should be explicitly represented as **Protected behavior** and executable verification links, not softened into design guidance:

- **Exactly-once request assembly:** authored upstream instructions and reference authority arrive exactly once; wrong-typed branches fail before provider submission.
- **Deep graph audit:** deterministic non-billable audits retain at least fifteen valid intermediate nodes plus a hidden wrong-typed edge.
- **Complete control propagation:** every visible provider-effective option survives node state → `GenerationRequest` → provider audit.
- **Typed ports are the sole connection contract:** renderer sockets, quick-connect, cardinality, and commit validation derive from the shared declarations; registered `nodeTypes` and packaged hovered nodes must be tested.
- **No silent truncation or invented capability:** provider/model enums, limits, reference budgets, pricing, and request fields must reflect the exact endpoint schema.
- **Migration safety:** legacy graphs/assets/nodes migrate in place, deterministically preserve authored work, and explicitly report disconnected surplus or incompatible state.
- **Persistence correctness:** hydration and runtime-only state must not dirty projects; in-flight edits cannot be falsely marked saved; interrupted runs reconcile against durable history/media.
- **Asset transactionality:** rename/delete updates every node, edge, snapshot, metadata record, managed file reference, and deployed instance without leaving recoverable stale caches.
- **Storyboard remains a node subsystem:** canonical ownership stays under `docs/features/nodes/workflow/storyboard/`; it must not become a top-level application branch.
- **Master regression semantics:** “test” means the accumulated automated, cross-node, request-audit, packaged visual, interaction, negative, cancellation, persistence, and previously missed regression suite.
- **Visual proof requirement:** source inspection or screenshots alone are insufficient; accepted UI behavior requires packaged Flight Tester inspection at practical zoom/window states.
- **Honest verification:** never claim unperformed desktop interaction or billable-provider execution passed.
- **Release protection:** internal Flight Tester is not a user deliverable; no release build/DMG refresh or “finished” declaration before explicit user acceptance; signing/notarization requires authorization.
- **Clean rollback parent:** preserve the last verified checkpoint; failed attempts cannot become the parent of a redo, and unrelated user work must survive surgical rollback.

## Migration risks

- **Section granularity is too coarse:** `Implement as a connected system` and `Enforce visual consistency` each contain many unrelated owners. Heading-level copying would recreate the monolith or produce conflicting duplicates.
- **Mixed normative levels:** implemented behavior, future intent, migration compatibility, and visual preference are interleaved. Each extracted rule needs a `Current`, `Required`, `Proposed`, `Deferred`, or `Historical` status.
- **Duplicated rules:** prompt ordering, Storyboard behavior, selector sizing, asset identity, typed ports, and regression doctrine recur in multiple sections. The migration source map must assign every paragraph one owner and convert other appearances to links.
- **Executable constants:** model catalogs, reference budgets, cardinalities, dimensions, timing values, and provider enums should point to code/contracts/tests where possible rather than remain independently maintained Markdown constants.
- **Orphaned prose:** lines 198–204 sit outside a heading and are especially vulnerable to omission.
- **Protected migration evidence:** keep the original monolith immutable and recoverable until paragraph-level parity, link validation, and representative selective-loading tests pass.
