# ADR-005: Storyboard Is a Node

- **Status:** Accepted
- **Decision:** Storyboard is a first-class node subsystem inside the Prism workflow graph.

## Context

The executable domain defines `storyboard` and `storyboard-asset` as node kinds with node data, typed connections, rendering, migration, provider compilation, asset behavior, and tests.

## Consequences

- Documentation lives under `features/nodes/workflow/storyboard/`.
- Storyboard changes must honor shared node, graph, persistence, generation, provider, asset, and test contracts.
- Storyboard must not be modeled as a separate top-level application.
- A future structural change requires a superseding ADR and migration plan.
