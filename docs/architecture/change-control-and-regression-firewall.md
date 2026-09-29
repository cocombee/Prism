# Change Control And Regression Firewall

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/architecture/change-control-and-regression-firewall.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `product-contract.md` → `Application structure and regression firewall`

---

## Application structure and regression firewall

- Organize product documentation by Prism Foundry's actual application ownership and containment. A visible feature that is implemented as a node belongs beneath the node branch rather than beside it; Storyboard is a node and is documented as `features/nodes/storyboard`. Cross-node systems such as Electron main, renderer, workflow graph, persistence, managed assets, provider integrations, typed contracts, testing, and release retain their own architecture branches.
- Every feature change begins with a bounded impact map covering its owning node or subsystem, shared components and validators, typed edges, persisted state and migrations, provider-effective requests, neighboring accepted behavior, and focused plus master-regression verification. The implementation must preserve every protected path not explicitly included in the requested change.
