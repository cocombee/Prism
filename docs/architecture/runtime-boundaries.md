# Runtime Boundaries

> **Status:** Current

## Main process
Privileged owner of credentials, filesystem operations, dialogs, provider network calls, project state, downloads, and the `prism-asset` protocol.

## Preload
Typed capability bridge only. It exposes projects, credentials, services, workflows, assets, assistant, generation, history, and experiments.

## Renderer
Untrusted presentation boundary. It must not receive raw API keys or direct filesystem privileges.

## Shared
Pure types and behavior used to keep node ports, request assembly, model capabilities, migrations, and tests consistent across runtime boundaries.

Any new privileged operation requires: typed API contract, preload exposure, validated main handler, authorization/path checks, error contract, and tests.


### Higgsfield public discovery ownership — 9 October 2026

Main HiggsfieldPublicCatalog owns credential-free document coalescing, bounded inert parsing and public memory caches. ScopedCatalogCache/provider request leases separately own project/profile delivery; renderer serviceResponseScope rejects late replies. Refresh never rewrites a saved graph, and catalog content is not persisted into user project files.

Native Electron session.fetch reachability is separately verified from Node/Python fetch. Only published official document links and exact declared production API IDs may enter discovery. No cookies/header workaround, CLI binary/private endpoint guess or alternate provider fallback. Provider controls owns traversal/field rules. Public metadata does not prove authenticated access, output efficacy or complete stable API enumeration.


Prompt ownership, final sections and typed speech integrity (2026-10-09): GenerationRequest adds local providerPromptOwnership(authored/compiled); native Auto overrides retain compiler ownership, Manual and genuinely unclassified legacy overrides retain exact authored behavior. Native endpoint identity owns routing over stale legacy model data. Explicit outer/native ownership records are reconciled: a nested compiled owner remains compiled when the outer owner is absent, and malformed/conflicting explicit records block before lifecycle work. The visible native final text must match its explicitly bound own string field before dispatch. Malformed declared typed dialogue records require review rather than becoming empty audio intent; explicit empty spans and unused exact-authored metadata retain their semantics. Compiled native DTO carries local promptOwnership and requiresGeneratedSpeech, reconstructed by main from the request. Typed dialogue requires enabled audio on legacy adapters; native execution checks the fresh owned generate_audio field/default before any media preparation/client/upload/submission, without guessing a control or toggling it. Local speech conflicts do not poison provider failure state. The shared final-section scanner is a leaf with existing section names/syntax only: one real final NEGATIVE PROMPT; duplicate/malformed/late recognized sections block generated Auto and complete recognized Auto masters without rewriting. Explicit Manual layout remains exact, including old HARD AVOID; declared input limits still apply. Generic generated positive locks precede its existing negative block. Pure checks precede generation IPC lifecycle ownership, direct main credential work and direct BytePlus resolution; direct native executor rejects malformed compiled bodies before schema lookup. Graph serialization rederives ownership/audio intent and preserves exact spoken text/payload. This is bounded structural/typed-intent correctness, not full current-skill geometry/timing, prose audio-intent inference, live output efficacy or final stress acceptance.


### Higgsfield exact request ownership — 9 October 2026

Main-only `higgsfieldSubmission` owns immutable serialization and bounded idempotency receipts. `higgsfieldJobLifecycle` binds them to the existing normalized request and private atomic journal before HTTP; `higgsfieldApi` sends those exact bytes/key and retains owned returned URLs. Explicit `higgsfieldJobRecovery` may reconcile one saved uncertain intent, with original project/document/node/profile/key identity, before polling/persistence. Renderer actions are the existing scoped commands; a non-secret `canReconcile` view flag is derived only after protected receipt validation. The shared action guard improves presentation only and never authorizes a provider call.

No new IPC command, retry loop, current-graph replay, alternate provider, or key regeneration is introduced. Accepted IDs/URLs are durable before status work, and 422/ambiguous/receipt-write failure keeps another Run blocked. Legacy unknown jobs without an original wire receipt remain explicit-dashboard-only. This source behavior is separately verified with native exported controls and actual compiled main helpers; installed/live-provider/OS secure-storage acceptance remains a later gate.
