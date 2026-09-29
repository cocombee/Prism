# Product Contract Clause-Level Migration Map

> **Status:** Current migration evidence
> **Purpose:** Prevent status overclaiming and rule loss while the imported contract is decomposed. `C` means source-confirmed Current; `P` means Required/Proposed until executable proof exists; `H` means Historical compatibility or migration behavior.

Until a listed leaf document is created and populated, the existing bounded contract-baseline document remains the readable rule container. This map controls status and future extraction; it is not permission to implement Proposed behavior.

### Status key

- **C** — Current and confirmed by the branching plan/runtime inspection.
- **P** — Proposed/Required product contract; do **not** call it Current until tied to source and tests.
- **H** — Historical compatibility or migration clause. The migration behavior may remain active, but the legacy state itself is Historical.
- **P/H** — Active required behavior containing historical migration handling.

## Canonical thematic map

| Source section / lines | Canonical target | Status |
|---|---|---|
| **Application structure and regression firewall** 3–7 |  |  |
| 5 | `docs/DOCUMENT-OWNERSHIP.md` | **C/Required** — Storyboard’s node classification is confirmed; the new ownership map is not yet implemented |
| 6 | `docs/CHANGE-IMPACT-TEMPLATE.md` | **P** |
| **Product hierarchy** 8–16 |  |  |
| 10 | `docs/features/application-shell/launcher-and-home.md` | **P** |
| 11 | `docs/data/project-folder-layout.md` | **P** |
| 12–13 | `docs/features/canvas/canvases-and-pages.md` | **P** |
| 14 | `docs/features/application-shell/navigation.md` | **P** |
| 15 | `docs/features/autosave-and-recovery/autosave.md` | **P** |
| **Asset information architecture** 17–43 |  |  |
| 19, 22 | `docs/features/asset-library/library-overview.md` | **P** |
| 20 | `docs/features/asset-library/import-and-promotion.md` | **P** |
| 21, 34 | `docs/features/asset-library/rename-delete-and-deployment.md` | **P** |
| 23, 30, 33 | `docs/features/asset-library/favorites-and-trash.md` | **P** |
| 24–26, 42 | `docs/features/nodes/semantic-assets/character-node.md` | **P/H** — line 25 includes six-view legacy completion |
| 27 | `docs/features/nodes/semantic-assets/element-node.md` | **P** |
| 28 | `docs/features/asset-library/missing-assets-and-relinking.md` | **P** |
| 29, 31–32, 36–37 | `docs/features/asset-library/semantic-collections.md` | **P/H** — legacy grouping/promotion clauses in line 32 |
| 35, 38 | `docs/design/color-typography-and-spacing.md` | **P** |
| 39 | `docs/features/nodes/node-lifecycle.md` | **P** |
| 40 | `docs/contracts/schema-migrations.md` | **H/Required** |
| **Style system** 44–60 |  |  |
| 46–54, 57–59 | `docs/features/nodes/semantic-assets/style-node.md` | **P/H** — legacy style resolution in lines 47 and 50 |
| 55 | `docs/design/media-presentation.md` | **P** |
| 56 | `docs/features/asset-library/portable-prismasset.md` | **P** |
| **Canvas and nodes** 61–89 |  |  |
| 63, 69 | `docs/features/canvas/canvas-workspace.md` | **P** |
| 64 | `docs/contracts/node-port-and-signal-contract.md` | **P** |
| 65 | `docs/features/canvas/selection-pan-and-zoom.md` | **P** |
| 66, 71–74 | `docs/features/nodes/node-lifecycle.md` | **P** |
| 67 | `docs/design/icon-system.md` | **P** |
| 68, 83–86 | `docs/features/canvas/grouping-locking-and-layout.md` | **P/H** — line 86 is repair of a historical auto-layout defect |
| 70 | `docs/features/canvas/clipboard-and-drag-drop.md` | **P** |
| 75–77 | `docs/features/nodes/run-states-and-presentation.md` | **P** |
| 78 | `docs/features/canvas/typed-connections.md` | **P** |
| 79 | `docs/design/panels-modals-and-menus.md` | **P** |
| 80 | `docs/features/canvas/selection-pan-and-zoom.md` | **P** |
| 81 | `docs/features/autosave-and-recovery/workflow-restoration.md` | **P** |
| 82 | `docs/features/nodes/canvas-utilities/frame-node.md` | **P** |
| 87 | `docs/features/application-shell/navigation.md` | **P** |
| 88 | `docs/design/canvas-interactions.md` | **P** |
| **Typed workflow behavior** 90–135 |  |  |
| 93–98 | `docs/design/ports-edges-and-signals.md` | **P**; topology/cardinality values must link to the executable contract |
| 99 | `docs/contracts/node-port-and-signal-contract.md` | **P** |
| 100 | `docs/features/nodes/output/output-node-compatibility.md` | **P/H** |
| 101–105, 107, 109–111 | `docs/features/generation/reference-order-and-fidelity.md` | **P** |
| 106 | `docs/features/asset-library/semantic-collections.md` | **P/H** |
| 108 | `docs/features/canvas/clipboard-and-drag-drop.md` | **P** |
| 112, 120, 122 | `docs/features/nodes/workflow/list-node.md` | **P** |
| 113–114, 118, 123–125 | `docs/contracts/node-port-and-signal-contract.md` | **P** |
| 115–116 | `docs/features/nodes/semantic-assets/style-node.md` | **P** |
| 117 | `docs/features/nodes/semantic-assets/character-node.md` | **P** |
| 119 | `docs/features/nodes/workflow/storyboard/migration-and-compatibility.md` | **P/H** |
| 121 | `docs/features/nodes/output/gallery-node.md` | **P/H** — legacy generated Output handling |
| 126–127, 134–135 | `docs/features/generation/request-assembly.md` | **P** |
| 128 | `docs/features/nodes/workflow/storyboard/generation-and-compilation.md` | **P** |
| 129, 131–133 | `docs/features/generation/request-assembly.md` | **P** |
| 130 | `docs/api/providers/account-status-billing-and-quotas.md` | **P** |
| **Storyboard** 136–147 |  |  |
| 138, 140–145 | `docs/features/nodes/workflow/storyboard/storyboard-panels.md` | **P** |
| 139 | `docs/features/nodes/workflow/storyboard/storyboard-node.md` | **P** |
| 141 | `docs/features/nodes/workflow/storyboard/storyboard-panels.md` | **P** |
| 146 | `docs/features/nodes/workflow/storyboard/generation-and-compilation.md` | **P** |
| **Generation controls and providers** 148–204 |  |  |
| 150, 152 | `docs/features/generation/generation-lifecycle.md` | **P** |
| 151 | `docs/features/nodes/workflow/list-node.md` | **P** |
| 153–154, 157–158, 163–164 | `docs/contracts/provider-capabilities.md` | **P** — exact limits/enums should be generated or executable |
| 155, 166–168, 194 | `docs/design/responsive-layout.md` | **P** |
| 156, 203 | `docs/design/icon-system.md` | **P** |
| 159 | `docs/features/nodes/generators/upscaler-node.md` | **P** |
| 160, 162 | `docs/api/providers/fal-ai.md` | **P** |
| 161, 197–198 | `docs/api/providers/account-status-billing-and-quotas.md` | **P** |
| 165 | `docs/api/providers/model-discovery.md` | **P/H** — Assistant compatibility is historical |
| 169, 192–193, 195 | `docs/features/nodes/generators/video-generator-node.md` | **P** |
| 170, 175, 179–180 | `docs/features/nodes/semantic-assets/character-node.md` | **P** |
| 171–172, 177–178 | `docs/features/nodes/node-status-matrix.md` | **P** |
| 173 | `docs/features/application-shell/navigation.md` | **P** |
| 174 | `docs/features/nodes/semantic-assets/element-node.md` | **P** |
| 176 | `docs/features/nodes/semantic-assets/style-node.md` | **P** |
| 181–182 | `docs/design/canvas-interactions.md` | **P** |
| 183–186 | `docs/features/nodes/run-states-and-presentation.md` | **P** |
| 187–188 | `docs/features/autosave-and-recovery/interrupted-run-recovery.md` | **P** |
| 189–191 | `docs/design/accessibility.md` | **P** |
| 196 | `docs/api/providers/capability-matrix.md` | **P** |
| 199–200 | `docs/testing/request-audits.md` | **P/H** — Image Editor and Music retirement clauses are historical |
| 201–202 | `docs/features/nodes/prompt/prompt-node.md` | **P/H** — Assistant retirement/compatibility |
| **Delete behavior** 205–214 |  |  |
| 207, 210–211 | `docs/design/panels-modals-and-menus.md` | **P** |
| 208–209 | `docs/data/retention-trash-and-deletion.md` | **P** |
| 212 | `docs/features/nodes/semantic-assets/style-node.md` | **P** |
| 213 | `docs/features/asset-library/rename-delete-and-deployment.md` | **P** |
| **Visual and interaction QA** 215–286 |  |  |
| 217 | `docs/product/vision-and-principles.md` | **P** |
| 218, 220, 231, 233 | `docs/design/color-typography-and-spacing.md` | **P** |
| 219, 229, 236, 243–244 | `docs/design/node-card-anatomy.md` | **P** |
| 221–224, 228, 230 | `docs/features/canvas/grouping-locking-and-layout.md` | **P** |
| 225–226 | `docs/design/application-shell.md` | **P** |
| 227 | `docs/features/nodes/canvas-utilities/drawing-node.md` | **H/Required compatibility** |
| 232, 264, 266, 268 | `docs/design/responsive-layout.md` | **P** |
| 234, 237 | `docs/design/panels-modals-and-menus.md` | **P** |
| 235 | `docs/features/application-shell/settings-and-connections.md` | **P** |
| 238, 240 | `docs/features/canvas/selection-pan-and-zoom.md` | **P** |
| 239 | `docs/features/canvas/minimap.md` | **P** |
| 241–242, 261–262 | `docs/testing/visual-and-interaction-qa.md` | **P** |
| 245 | `docs/features/nodes/generators/upscaler-node.md` | **P** |
| 246–247 | `docs/features/nodes/generators/voiceover-node.md` | **P** |
| 248 | `docs/features/nodes/retirement-and-migrations.md` | **P/H** |
| 249–250 | `docs/features/nodes/defaults-and-reset.md` | **P** |
| 251 | `docs/features/nodes/node-lifecycle.md` | **P** |
| 252 | `docs/design/ports-edges-and-signals.md` | **P** |
| 253 | `docs/features/generation/prompt-compilation.md` | **P** |
| 254 | `docs/features/generation/generation-lifecycle.md` | **P** |
| 255 | `docs/api/providers/model-discovery.md` | **P** |
| 256 | `docs/design/icon-system.md` | **P** |
| 257, 303–304 | `docs/design/media-presentation.md` | **P** |
| 258 | `docs/features/nodes/workflow/storyboard/storyboard-node.md` | **P/H** — legacy Creator/result absorption |
| 259 | `docs/testing/node-contract-tests.md` | **P** |
| 260 | `docs/design/canvas-interactions.md` | **P** |
| 270 | `docs/features/nodes/generators/image-generator-node.md` | **P** |
| 272, 282 | `docs/features/nodes/generators/image-editor-compatibility.md` | **H/Required migration** |
| 274 | `docs/api/providers/provider-error-normalization.md` | **P** |
| 276 | `docs/api/providers/fal-ai.md` | **P** |
| 278, 280 | `docs/features/generation/reference-order-and-fidelity.md` | **P** |
| 284–285 | `docs/features/nodes/semantic-assets/character-node.md` | **P/H** |
| **Prompt pipeline and shot continuity** 287–293 |  |  |
| 289–290 | `docs/features/nodes/workflow/storyboard/provider-shot-contract.md` | **P** |
| 291 | `docs/features/generation/progress-cancellation-and-stale-results.md` | **P** |
| 292 | `docs/features/generation/history-and-experiments.md` | **P** |
| **Flight Tester release gate** 294–311 |  |  |
| 296–297, 300–302, 311 | `docs/release/release-gates.md` | **C policy / Required documentation** |
| 298 | `docs/security/authentication/credential-storage-and-removal.md` | **P** |
| 299, 308–310 | `docs/features/generation/pricing-and-estimates.md` | **P** |
| 303–305 | `docs/features/application-shell/media-viewer.md` | **P** |
| 306 | `docs/features/nodes/generators/image-generator-node.md` | **P/H** — defensive legacy Image Editor surface |
| 307 | `docs/design/node-card-anatomy.md` | **P** |

## Principal migration risks

- **Status overclaiming:** The plan confirms runtime structure, not the monolith’s many pixel-, provider-, and interaction-level requirements. Most rules must remain **Proposed/Required** until source symbols and tests prove them Current.
- **Compound paragraphs:** Many single bullets contain feature, design, contract, persistence, and test clauses. They must be atomized without paraphrasing away exact numbers, orders, limits, timing, negative requirements, or error behavior.
- **Historical versus obsolete:** Legacy migration clauses must move into compatibility/migration documents; they must not be deleted merely because the originating state is Historical.
- **Executable duplication:** Port cardinalities, provider enums/limits, schemas, model IDs, IPC definitions, and request shapes should be generated or validated from code. Markdown should own intent and invariants, not become a competing capability registry.
- **Cross-links are not duplicate owners:** Storyboard, semantic assets, generation, and deletion are highly cross-cutting. Each rule needs one owner above, with dependency links from affected documents.
- **Conflict detection required:** The contract contains layered corrections and superseding rules. Migration needs a clause-level precedence review before any “duplicate” prose is removed.
- **Parity gate:** Retain the original contract as immutable Historical migration evidence until every normative clause has an owner, status, source anchor, dependency link, and verification target.
