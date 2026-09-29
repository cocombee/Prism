# Prism Approved and In-Flight Design Artifacts

> **Status:** Current registry
> **Updated:** 2026-08-25
> **Owner:** Designer for design authority; Admin for this index
>
> This registry records the exact status of existing design baselines and reviews. `Approved for Developer` or `Approved for Build` authorizes the bounded source lane named by the review; it is not the same as final visual or user acceptance. Blocked and unverified work remains visible as such.

## Governing baselines

- [Visual and interaction standard](visual-and-interaction-standard.md) — **Required contract baseline; mixed Current/Proposed/Historical.** Each clause must be confirmed against executable source, tests, and packaged visual QA before implementation acceptance.
- [Selector and discrete-control doctrine](selector-and-discrete-controls.md) — **Required contract baseline.** Source and packaged Flight Tester verification remain part of acceptance; this document is not a blanket final visual approval.

## Reviewed design artifacts

| Artifact | Latest recorded status | Owner / next gate |
|---|---|---|
| [Storyboard Revamp All — coherent batch design review](reviews/storyboard-revamp-all-coherent-batch-design-review-2026-08-23.md) | Pre-code contract was approved for Developer; latest `RA-01 APPROVED FOR BUILD`. | Developer implements; final bounded visual/user checks remain where the review says they do. |
| [Storyboard ordered-duration budget design review](reviews/storyboard-ordered-duration-budget-design-review-2026-08-23.md) | Latest `PC-01 APPROVED FOR BUILD`; earlier revisions are explicitly retained as blocked history. | Developer implements; remaining manual Flight Tester checks are user-owned. |
| [Prism node-notification category audit](reviews/prism-node-notification-category-audit-2026-08-23.md) | Category contract approved and latest `APPROVED FOR BUILD`; system-wide propagation and rendered acceptance remain gated by the report. | Developer confirms the active `NodeCardNext` target and returns the rendered evidence required by the review. |
| [Storyboard compiler-owned prompt and camera-bridge review](reviews/storyboard-compiler-owned-prompt-camera-bridge-review-2026-08-23.md) | Pre-code contract approved for Developer; latest `APPROVED FOR BUILD`. Final visual verdict remains explicitly unverified until its rendered matrix passes. | Developer implements; Designer performs the bounded post-implementation review when requested. |

## Prism interface and naming contract

- [Prism interface and naming design contract](prism-interface-and-naming-design-contract.md) — **Developer-ready Designer contract, version 0.1.0.** Promoted unchanged from Designer card `t_8c5140bb`; SHA-256 `5d4414b101f38450d2037b0f0b394d9c64b6548438874a57cd6a84e7b800e29d`. It authorizes bounded implementation by Developer but does not claim rendered or user acceptance.

## Delegated implementation state

- `t_8c5140bb` — **Design the Prism interface and naming experience** — complete; canonical contract linked above.
- `t_030ae39b` — **Implement the Prism software foundation** — complete as an isolated, provider-neutral TypeScript package with 34 passing tests, typecheck, build, and package dry-run. It is a quarantined implementation candidate, not yet integrated into the canonical Prism Foundry application under `work/`.
- Canonical application integration and one stable rendered candidate remain Developer-owned follow-up work; Designer owns the bounded post-implementation design review.

## Registry rules

1. A design artifact is not final merely because it exists under `docs/design/`; use the artifact's own latest verdict and gate.
2. Designer is the design authority and may create or revise design artifacts; Developer is the sole source writer.
3. Admin may index, preserve, and mirror artifacts without changing their semantic or visual decisions.
4. New artifacts must use lowercase kebab-case filenames and link to their owning branch. Existing historic filenames and review history are preserved.
5. This registry links to the approved system specification at [`../product/prism-system-scope-and-naming.md`](../product/prism-system-scope-and-naming.md) and the structural record at [`../operations/prism-operations-and-delegation.md`](../operations/prism-operations-and-delegation.md).
