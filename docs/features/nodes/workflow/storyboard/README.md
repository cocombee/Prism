# Storyboard Node Subsystem

> **Status:** Current

Storyboard is a first-class workflow node, not a separate application or top-level feature. Its executable behavior spans `NodeKind`, `StoryboardPanel`, node rendering, typed ports, workflow resolution, migration, provider prompt compilation, asset deployment, and regression tests.

## Canonical documents

- `storyboard-node.md` — inherited behavior contract.
- `provider-shot-contract.md` — request compilation and provider boundaries.
- `regression-matrix.md` — protected graph, migration, generation, and asset behavior.

## Source anchors

`src/shared/types.ts`, `storyboardGeneration.ts`, `storyboardMigration.ts`, `workflowResolver.ts`, `nodeConnections.ts`, `referenceInstructions.ts`, `shotSpec.ts`, `src/renderer/src/UtilityNodes.tsx`, and Storyboard tests.
