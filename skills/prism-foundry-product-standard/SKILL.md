---
name: prism-foundry-product-standard
description: Apply Prism Foundry’s scoped product and release standards.
version: 2.0.4
author: MrKokóm, Hermes Agent
license: UNLICENSED
platforms: [macos]
metadata:
  hermes:
    tags: [Prism Foundry, Electron, React, Product Standards]
    related_skills: []
    lineage: inherited-converted-and-branched
---

# Prism Foundry Product Standard

Use this skill as the selective-loading router for Prism Foundry. Product behavior now lives in bounded application documentation; this file must not become a second product database.

## When to use

- Designing, implementing, reviewing, debugging, testing, packaging, or releasing Prism Foundry.
- Changing Electron main, preload/IPC, renderer, shared contracts, nodes, Storyboard, assets, persistence, providers, credentials, security, or release behavior.
- Do not use for unrelated applications or general Hermes workspace organization.

## Canonical task paths

- Task: `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism`
- Implementation: `work/`
- Documentation router: `docs/README.md`
- Outputs: `outputs/`
- Pre-branch rollback checkpoint: `.hermes/checkpoints/2026-08-20-prism-pre-branch/`
- Migration map: `references/migration-source-map.md`

## Working-app retention

- Retain exactly one accepted, runnable working app outside an active edit transition.
- During the next edit, keep that working app as the sole temporary fallback and build one replacement without deleting it first.
- Feedback rejects only the exact behavior the user identifies. Preserve every unmentioned working change and patch forward from the current source; reject the whole replacement only when the user explicitly says the build or previous edit is not working.
- When the user moves to another edit or topic, treat the remaining replacement as accepted working, promote it to the canonical working path, and remove the former fallback plus obsolete runnable candidates.
- Keep lightweight manifests, reviews, and diagnostics when useful; they are not runnable fallbacks.

Readable links:

- [Migration source map](references/migration-source-map.md)
- [Historical imported product contract](references/product-contract.md)
- Obsidian clause audit: [[Handoffs/AI Video/Prism/docs/MIGRATION-CLAUSE-MAP|Product-contract clause map]]
- Obsidian skill audit: [[Handoffs/AI Video/Prism/docs/SKILL-SECTION-MAP|Legacy skill section map]]
- Obsidian projection: [[Handoffs/AI Video/Prism/docs/README|Prism documentation router]]

The historical Codex tree is read-only provenance. Do not edit or use it as the parent of new work.

## Codex build/repair assimilation (read-only provenance)

This section records how Codex actually built the repair so Hermes can adopt the method without copying Codex source or duplicating work. It is a provenance procedure, not permission to resume source repair.

### Evidence anchors and limits

- Codex source tree inspected read-only: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/AI Video/Magnific Style Software`.
- Codex source-task lineage in the preserved Codex transcript: source `01a00835-4635-7d82-9824-e1f2a7e9e7bf`, successor `01a00964-4b42-7f21-993a-07aea67bfc64`.
- Exact Codex CLI review/session evidence: `/Users/mrkokom/.codex/sessions/2026/08/21/rollout-2026-08-21T09-39-42-01a021f9-52ef-7822-a09d-cd1053d52883.jsonl`.
- Codex artifact recorded in that transcript: `Codex/AI Video/Magnific Style Software/outputs/candidates/Prism/mac-arm64/Prism.app`; its verified `app.asar` hash was `d4cc397c4695d082987dddce1ae45bd16176b1b8664ae2b1c8e43b67ead8c3bf`, bundle identifier `com.cocombees.prism.codex`, arm64, ad-hoc strict verification passed.
- Hermes artifact compared separately: `outputs/candidates/2026-08-21-storyboard-character-wire-repair-v7/mac-arm64/Prism Flight Tester.app`; its verified `app.asar` hash is `85154625d362d63bbe0c9e4b25c3523e49e06f3f6936f53c40789f41425d3784`, bundle identifier `com.cocombees.prismfoundry`, arm64, ad-hoc strict verification passed.
- The Codex source tree is not a usable normal Git history and contains no task checkpoint/release manifest proving a commit-based diff. Some nested transcript entries are omitted. Treat the numbered transcript, live source hashes, package hashes, and command results as the evidence boundary; do not invent commits, timestamps, or missing implementation turns.
- The two packages are not interchangeable: Codex readback contained `out/renderer/index.html`; Hermes v7 contained `out/renderer/index-next.html`. A package entry or source marker proves only that bounded package evidence, not complete visual acceptance.

### Reconstructed Codex workflow

1. **Lock the parent and boundaries.** Start from the named Codex project, one physical task folder, explicit `work/` and `outputs/` roots, a protected fallback, and a fresh candidate output. The successor handoff prohibited extra projects, nested duplicates, unrelated worktrees, Documents access, provider Run/Rerun, and interruption of user generation. Hermes must first record the current source/checkpoint hashes and fallback before accepting any Codex result.
2. **Decompose into bounded implementation lanes.** Use the user reports and corrected product scope as lanes: output/React Flow handle behavior; terminal media clipping; ordinary-image semantic routing to Image/Video inputs including Start/End; lowercase asset intake/rename; Character Single/Multi persistence/downstream semantics; and dynamic model-port reconciliation. Storyboard remained unchanged after the correction. Each lane names its active source, shared contract, renderer surface, and focused tests. A scope correction replaces the stale lane; it does not leave both interpretations active.
3. **Implement against the active source boundary.** Codex inspected existing behavior first, retained React Flow ownership of pointer/touch down, reused shared semantic port compatibility, and added the smallest missing declarations/helpers or renderer rules. Hermes must map Codex legacy names (`App.tsx`, `NodeCard.tsx`, `styles.css`) to the current successor names (`AppNext.tsx`, `NodeCardNext.tsx`, `styles-next.css`) instead of copying files wholesale.
4. **Run focused gates before broad gates.** The preserved sequence includes `npm run typecheck` plus focused Vitest runs over Storyboard generation, workflow resolution, node ports/connections, asset naming, and the active renderer product-surface suite. One observed focused run reached 147/147 after fixing a source-contract expectation; a later corrected Character/dynamic-port suite reached 200 tests before final additions. Focused failures were traced to the smallest source/test-contract mismatch, not hidden by weakening the rule.
5. **Repair integration/test-contract failures explicitly.** The transcript records two missing pre-existing declarations (`generationControllers` and `runnableKinds`) found by TypeScript, a deliberate CSS expectation update for a variable Storyboard ratio, and product-skill/contract wording additions for basename-only Rename. The fix-and-rerun loop is part of the method; it is not evidence that the initial run was green.
6. **Run the accumulated master gate.** After focused green, Codex ran `npm run typecheck && npm test -- --run`, reaching 61 test files / 548 tests and clean TypeScript. It then ran `npm run build`, which completed the Electron/Vite main, preload, and renderer production build. Earlier intermediate evidence showed 60 files / 541 tests; record the final gate, not only an intermediate count.
7. **Package only after source gates.** The recorded command was `CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dir --arm64` from the Codex `work/` directory. The first attempt reached packaging but failed on `getaddrinfo ENOTFOUND github.com`; the same command was retried with explicit network approval. Electron-builder skipped automatic signing because identity discovery was disabled and wrote to the isolated Codex candidate folder.
8. **Sign and verify the exact artifact.** The Codex transcript records ad-hoc `codesign --force --deep --sign -` followed by strict deep verification. Verify architecture, executable, bundle identifier, archive hash, and archive readback. Do not treat an ad-hoc signature as approval or as proof of visual correctness.
9. **Separate runtime inspection from packaging.** Codex initially discovered that its package and Hermes shared the same bundle identifier and Electron data location; it stopped rather than risk cross-app state and then used a distinct Codex identity/profile (`com.cocombees.prism.codex`, `prism-codex`). The adopted rule is to isolate identity and user data before launch, confirm saved/no-active-generation state, inspect without paid Run/Rerun, and stop before acceptance/promotion.
10. **Handoff evidence, not a source dump.** Codex handoff must include: parent/checkpoint identity; exact changed-file list grouped by lane; focused and master commands/results; build/package/sign commands/results; artifact path/hash/identity; runtime states actually exercised; unresolved risks; and whether user acceptance occurred. Hermes then compares the bounded source/package behavior, classifies each difference, selectively assimilates the procedure, and leaves the Codex tree untouched.

### Why the observed Codex path was faster

This is a process explanation, not a measured benchmark. The preserved evidence shows Codex kept one named task and source boundary, worked through explicit lanes, ran focused tests before the full suite, deferred packaging until source gates were green, and did not put Obsidian mirroring or broad documentation restructuring in the implementation critical path. Hermes should adopt those constraints to prevent scope expansion, repeated rebuilds, and duplicate implementation. The speed lesson is not “skip tests” or “copy faster”; it is “finish one bounded source lane, prove it, then hand off exact evidence.”

### Assimilation classification

- **Adopt:** exact parent/checkpoint continuity; bounded Codex implementation lanes; active-file/source mapping; focused tests before master tests; typecheck/build gates; isolated candidate output; distinct app identity and temporary user data before launch; ad-hoc signature plus archive/hash readback; explicit unresolved-risk handoff; no paid provider operations.
- **Reject:** wholesale Codex-tree copying; using the Codex tree as Hermes’ parent; reusing the same bundle identifier/user-data profile; reusing a candidate output directory that can be removed or overwritten during a failed package attempt; packaging before source gates; relying on source-string tests or green counts as visual acceptance; launching while the other app can touch shared state; treating ad-hoc signing as approval.
- **Shared defect/acceptance gap:** neither the Codex package nor Hermes v7 package proves complete visual/runtime acceptance from static readback. The current Hermes source also retains separately recorded Storyboard stale-migration/async-compile and Character managed-view/persistence blockers. These remain source-review findings, not reasons to copy Codex or to promote v7.
- **Current Hermes improvement to preserve:** Hermes currently has successor renderer boundaries and stronger managed ordinary-media normalization/rename rollback handling than the live Codex tree. Assimilation must not regress those boundaries while adopting Codex’s process.

## Required procedure

1. Read `../../docs/README.md` and `../../docs/CURRENT-STATE.md`.
2. Classify the task by product, feature, design, API, architecture, security, contract, data, testing, operations, release, or decision ownership.
3. Load only the affected canonical documents and their declared dependencies.
4. For every non-trivial change, complete `../../docs/CHANGE-IMPACT-TEMPLATE.md` before editing.
5. Record the last verified checkpoint, files allowed to change, protected behavior, tests, and rollback set.
6. Inspect executable source, definitions, usages, migrations, and tests. Markdown is not executable proof.
7. When a Codex or other provenance output appears better, first prove which package matches which source by byte or hash evidence. Compare the bounded behavior, classify each difference as adopt, reject, or shared defect, and never use a provenance tree wholesale as a repair parent.
8. If Codex has already built a candidate, inspect that exact existing artifact. Do not rebuild, repackage, resign, regenerate, replace, launch a second copy, approve, or promote it merely to complete inspection. Record the exact artifact path, `app.asar` SHA-256, bundle identifier/product/architecture, signature verification result, and packaged entry/readback. Compare packaged behavior to the current Hermes source and tests before drawing conclusions.
9. Keep static package evidence separate from visual/runtime evidence. Static evidence covers archive contents, source/entry identity, strings/CSS, hashes, and signature. Runtime evidence covers only states actually exercised. Use isolated temporary user data and an isolated temporary project/fixture; preserve the approved fallback and do not mutate a user project to obtain evidence.
10. If a native file chooser, permission prompt, or foreground-approval step blocks inspection, do not bypass it or invent a result. Stop that path and record the visual/runtime coverage as incomplete, including the exact blocked surface and observed packaged evidence.
11. Apply one bounded, reversible source change only when the user authorizes source work. For focused iteration, use the verification budget below: reproduce the bug with a focused behavioral regression, run only affected neighbouring/shared tests, typecheck only when TypeScript or contracts changed, build once at the end, then package/open Flight Tester once. Physical UI testing belongs to the user unless they explicitly request agent-driven physical testing.
12. Promote a result to the next verified checkpoint only after all gates pass and user verification is complete when required. Existing-candidate inspection ends before candidate approval or promotion unless the user separately authorizes those actions.
13. Synchronize approved Hermes documentation to the existing Obsidian vault and verify hashes and graph reachability only after canonical completion and user-verified approval; never queue projection for an unapproved candidate.

## Selective-loading map

| Change | Load first |
|---|---|
| Product intent | `../../docs/product/` and affected feature/tests |
| Node behavior | `../../docs/features/nodes/`, graph contracts, relevant tests |
| Storyboard | `../../docs/features/nodes/workflow/storyboard/` plus graph, generation, provider, asset, persistence, and Storyboard tests |
| Canvas/graph | `../../docs/features/canvas/`, node contracts, workflow tests |
| Provider/API | `../../docs/api/`, authentication/security, generation contracts, provider tests |
| Credentials/authorization | `../../docs/security/`, services IPC, provider docs, security tests |
| Persistence/data | `../../docs/architecture/`, `../../docs/data/`, schemas, migration and rollback tests |
| UI/design | affected feature, `../../docs/design/`, renderer rules, visual QA |
| Release | `../../docs/release/`, security gates, packaged-app smoke tests, rollback |

## Non-negotiable architecture rules

- Storyboard is a first-class node subsystem under `docs/features/nodes/workflow/storyboard/`.
- Internal IPC APIs and external provider APIs have separate owners.
- Provider API-key authentication is not Prism user authentication.
- Current local authorization consists of preload capabilities, IPC validation, active-project checks, managed-root containment, and provider permissions.
- Unimplemented accounts, sessions, RBAC, cloud collaboration, updater rollback, signing, or notarization must be labeled Proposed or Deferred.
- Critical schemas, ports, capabilities, limits, and migrations must point to source/types/tests rather than prose copies.
- A cross-domain change requires an explicit impact map and all affected regression gates.

## Rollback and redo commands

- **Rollback:** restore exactly the current attempt’s touched files to the last verified checkpoint, verify hashes and regression gates, then stop.
- **Redo:** restore the last verified checkpoint first, then make a fresh attempt using failure evidence.
- **It doesn’t work:** mark the candidate failed, preserve diagnostics, restore the checkpoint, identify root cause, then redo cleanly.

A failed candidate may inform diagnosis but never parent new work. Never blind-retry side effects. Rollback must preserve unrelated files and user work.

## Focused iteration verification budget

Use this budget by default for targeted Prism UI or behavior edits. It deliberately optimizes for fast iteration and does not replace release verification.

### Required focused gate

1. Inspect only the affected implementation, definitions/usages, and directly relevant tests.
2. Add or update one behavioral regression that reproduces the reported defect; avoid source-string assertions when a behavioral test already protects the same contract.
3. Run the focused regression plus neighbouring tests for any shared helper or boundary changed.
4. Run typecheck only when TypeScript, shared types, IPC, request shapes, or contracts changed.
5. Run one production build after the final source edit. Do not repeat packaging after every intermediate patch.
6. Package and open one Flight Tester after the focused tests and build pass. Opening is the handoff; do not inspect or operate the live app afterward.
7. Stop immediately after opening. The user owns every live/physical check unless they explicitly delegate it: no `computer_use`, screenshots, AX/DOM inspection, clicking, scrolling, selector/menu/model inspection, cursor checks, or live prompt comparison.
8. Report only the focused test/typecheck/build/package/open evidence and the exact manual checks left to the user.

### User-led visual implementation loop

- If the user names an approved Prism component to follow, use that component's exact active markup and final CSS as the design specification. Do not invent a sibling design or wait for a separate visual exploration.
- Before coding, compare the exact text/icon anatomy, dimensions, padding, radius, fill, outline, hover/selected/disabled states, alignment, scrollbar clearance, resize grip, and node width. Copy the owning classes/components where possible instead of recreating approximate CSS.
- Load the `proposal` skill only when the user explicitly requests a Proposal or mockup. Otherwise implement the named visual correction directly in production source: name the exact painted source→target relationship and protected cumulative set, write the focused regression first, build/package/open once, and stop for live inspection.
- Run one focused TDD implementation batch, typecheck, build/package/open once, then stop for the user's visual inspection. Do not perform agent screenshots/click audits unless explicitly requested.
- User corrections are the visual acceptance gate. Preserve accepted behavior, patch only named defects, update the owning product/design lesson, and avoid another broad audit.
- Do not synchronize project/task artifacts to Obsidian unless the user explicitly asks. Profile skill mirrors remain a separate approved lifecycle.

### Skip by default during focused iteration

- Agent-driven clicking, screenshots, AX/DOM inspection, visual walkthroughs, selector/menu/model checks, cursor checks, and repeated process-count checks after the tester opens.
- The full test suite when the changed path is isolated and focused plus shared-boundary tests are green.
- Full release gates: signing, notarization, dependency audit, archive/ASAR hashes or readback, release manifests, candidate promotion, and broad packaged-app smoke tests. These add no focused edit/build value unless the user explicitly requests release verification.
- Live provider/model-catalog probes, account checks, or inference after packaging. Static/local contract tests are sufficient for the handoff unless the user explicitly requests a live provider check.
- Re-running the same passing command when no relevant source changed.
- Rebuilding or repackaging after documentation-only changes.
- Typecheck after documentation-only or isolated CSS-only changes.
- Provider identity, balance, credit, or connectivity probes unless the task changes that integration or the user explicitly asks.
- Unrelated providers, nodes, Canvas tools, project flows, platforms, and architectures.
- Broad visual regression checks for non-visual changes.
- Duplicate source-contract tests when executable behavioral coverage already exists.
- Claude/security supervision for ordinary UI or behavior fixes.

### Escalate beyond the focused gate

Run the affected security/data/release gates when the change touches credentials, authorization, destructive storage, project/workflow schema or migration, dependencies, packaging configuration, signing/notarization, provider request contracts, promotion, or release approval. Run the full suite only when the change is broad/cross-cutting, a focused failure indicates wider coupling, the user requests it, or a candidate is being approved/promoted.

## Verification minimum

- Expected product surfaces remain present.
- Node kinds, ports, handles, defaults, and graph behavior remain compatible.
- Storyboard remains a node and passes its regression matrix.
- Provider request shapes, reference order, model capability, pricing, and error contracts remain valid.
- Project, workflow, asset, history, and portable formats preserve schema and migration safety.
- Main/preload/renderer security boundaries remain intact.
- Targeted tests and affected cross-boundary regressions pass; typecheck/build are run according to the focused budget. Physical QA is user-owned unless explicitly delegated to the agent.
- Release artifacts retain source/version identity, hashes, smoke evidence, and an approved rollback parent.
- For an already-built Codex candidate, release evidence must name the exact existing artifact, `app.asar` hash, bundle identity, signature result, packaged readback, and the separate static versus visual/runtime coverage. A candidate with incomplete visual coverage remains unapproved.
- Ordinary terminal Image, Video, Upload, and Output media use a locally clipped rounded wrapper while the media retains its natural rendered aspect ratio. A fixed ratio belongs only to an explicitly designed or user-selected stage. Regression guards must reject forced terminal `aspect-ratio`, `height: 100%`, Output radius removal, and whole-node clipping.

## Migration evidence

The imported monolith remains inactive migration evidence in `references/product-contract.md`. Its active sections were assigned to canonical scoped documents in `references/migration-source-map.md`. The immutable pre-branch originals and hashes are retained in the checkpoint until migration parity and rollback verification pass.

## Pitfalls

- With structured Storyboard shots, never feed the compiler-generated carrier prompt back into authored-field parsing: `authoredPrompt ?? (shots.length ? '' : prompt)` prevents duplicate action, camera, and Hard Cut blocks. Recursive tag highlighting must use the resolver's cycle-safe upstream semantic authorities, including Wardrobe through Character/Storyboard chains. Built-in Style LOOK always resolves the current preset payload by `stylePresetId`; only explicit saved custom Style state may own persisted text.
- Locked/User Video ownership is byte-exact: Locked and visible Composed Provider Prompt share one pure body; first User seed and explicit Reset copy that whole body, while edited User remains independent. Compiler-owned EDIT CONTROL may change only Locked until Reset.

- Connected Video prompts maintain independent Locked and User state: Locked is derived and never persisted as authority; User seeds exactly once from the complete Locked body, then only user edits or explicit Reset change it. Request assembly, composed preview, and readiness must derive atomically from active mode. Revamp receives compiler bridge constraints but never owns timing/FOV/transition metadata.

- Identical terminal notification copy still represents a new event: increment a monotonic notification version on each committed terminal emission and key expiry by node, copy, and version. Route every actionable lifecycle error through the central transition so it clears stale progress immediately. Revamp Shot and Revamp All must share one whole-sequence mention policy: exact anchors repeat at point of use, while adjacent same-scene prose inherits established description and never steals neighbouring introductions.

- Node notification lifetime is semantic, not inferred from `progress`/`error` CSS: running exists only while queued/running; terminal information expires after 5200ms through an exact node+progress+version guard; actionable errors persist; readiness and derived helpers remain condition-driven. Generic NodeCardNext, Storyboard, and Assistant share lifecycle geometry/ARIA, while global transient information stays separate from persistent global errors.

- Controlled Storyboard textareas must capture selection before parent writes and restore a clamped pending range in layout after the controlled value commits; explicit tag completion owns its own caret. Stop native text-history shortcut propagation without preventing default. Canvas history snapshots and restores must sanitize queued/running node and sequence presentation so undo/redo can never resurrect a request that no longer exists.

- Connected semantic anchors have two explicit paths. Deterministic exact-safe-alias/single-Location requirements may replace a surviving exact alias before validation. Language, dialect, slang, transliteration, colloquial spelling, and misspelling recognition belongs to the selected provider through the shared semantic-tagging policy, not translation dictionaries. Every connected canonical authority is exposed as a semantic candidate; source validation accepts only exact connected canonical tags, preserves authored tags, and rejects ambiguity guesses, wrong case, duplicates, ordinals, hidden context, and atomic-batch violations.

- Storyboard feedback geometry belongs to one shared `storyboard-feedback-row` class using the approved node-control min-height, horizontal inset, and flex centering; helper/status variants own semantics only and must not copy padding or typography.

- Storyboard startup must hydrate connected direct text-model catalogs from connection-state changes, not from opening Connections. While a selected catalog is missing/failing, retain only the eligible saved provider/model using `modelDisplayName`, and use that same merged catalog for rendering and Revamp resolution. Keep helper/status rows content-driven on one compact base, and let the native Storyboard overflow scroller consume wheel deltas while only stopping Canvas propagation—never combine manual `scrollTop` mutation with `preventDefault`.

- Storyboard Revamp All is one paid coherent batch, not a loop: include every ordered panel as full read-only/editable context, require exact ordered JSON for all and only editable targets, parse and run every panel-specific validator before one atomic apply, reject transport leakage or any invalid record with zero mutation/no fallback, and guard the scoped busy lifecycle in both caller and controls. Revamp Shot remains one target and one call.

- Storyboard ordered duration is one deterministic Single Sequence budget: run every panel/target/model/mode/add/delete mutation through the shared reconciler, reserve locked downstream positive durations, keep unavailable positive options visible but centrally unselectable, represent exhaustion only as system numeric `0s` with no hidden desired state, and reject the first zero-duration panel at both workflow resolution and provider shot compilation. Separate Shots keeps independent model limits.

- Storyboard text-model catalogs must apply one shared text-assistant eligibility filter before newest-release ranking: exclude audio/realtime/speech/voice/TTS/transcription/Whisper/sound/music semantics and any OmniRoute record with audio output, while retaining text-output vision/multimodal reasoning models. Model selection is free/read-only; clicking Revamp is a paid inference request that may consume provider credit. Keep Storyboard running/error copy compact and provider-neutral, preserve HTTP status and provider identity in non-secret Connections diagnostics, and never verify these contracts with live inference.

- Every asset kind that exposes Batch must route through one shared Batch surface and lifecycle: drop zone, staged row layout, rename/remove icons, individual Save, Save All, saved/error state, and final editor transition. Kind-specific branches may define validation and persisted metadata only; do not fork Batch UI or save behavior per asset kind.
- Treat Canvas-derived `workflow-media:*` Library entries as real recoverable deletion candidates even before they have an indexed managed record. Trash must persist a recoverable synthetic record, prune its workflow deployments atomically, and preserve Undo; relink must classify selection from the returned normalized asset set so synthetic and managed identities never coexist visibly.
- Scope selection, Delete/Backspace, and Command+A by pointer ownership, not by whether the side Library is merely open. Library activity clears Canvas node/edge selection and owns Command+A plus both macOS Backspace and forward Delete; Canvas activity clears Library selection and restores one-or-many node deletion. Approved Canvas controls (top bar, tool rail, page strip, minimap/zoom, inspector, and side-panel open/close controls) clear Library selection but preserve selected Canvas nodes. In the outside Library, only asset-card interactions preserve/modify selection; empty space, category changes, source filters, and search interaction clear it.
- Before launching a newly packaged Prism Flight Tester, explicitly quit the previously running Flight Tester and verify its main process has exited. Only then open the new build once; do not rely on macOS application-name routing to replace the running bundle.
- Nested node placeholders must claim supported Finder/Canvas-asset drags in the capture phase before any surrounding Canvas fallback can materialize the same drop. Centralize the claimant and drag-active state across sibling placeholders; regression-test both target adoption and absence of fallback deployment.
- When a visual state is declared in more than one stylesheet, inspect renderer import order and make the final loaded owner authoritative. A passing assertion against an earlier CSS file does not prove the rendered selector survives a later override.
- Outside Library selected-card rings must render in a pointer-transparent top layer above thumbnails and inherit the card radius; parent outlines alone can lose their rounded corner segments beneath media descendants. Keep the side Library's existing compact outline independent.
- Wardrobe is a Location-parity reusable asset for intake/storage/UI, but its graph scope is Character-bound: expose one `wardrobe-in` on Character only, allow one Wardrobe source to fan out to many Characters, and never add downstream Wardrobe sockets to Storyboard/generators. Carry the bound Character tag into provider-neutral and Seedance authority text so garments cannot drift or transfer between Characters.
- Keep special-asset intake requirements visible and short in each placeholder rather than implying unsupported content detection. Use kind-specific minimums (`2+` where Batch requires it), describe Character/Element sheet view requirements, and label Wardrobe inputs as images without faces. Do not ship a detector unless a reliable bundled model/runtime is explicitly approved and verified across every intake route.
- React Flow's installed release hit-test uses `elementFromPoint` and accepts only when the topmost element itself is `.react-flow__handle`; it does not climb from a painted child. Therefore every decorative child that fills a `Handle` (for example `.node-port-visual`) must be `pointer-events: none` so the real Handle owns mouse/touch start and release. A pure `nodeConnectionError(...) === null` test proves semantic legality, not physical delivery. Keep connect-end defense too: recover the `.react-flow__node` body via `data-id`, preserve explicit reported/DOM handles, derive a missing uniquely typed socket through `compatibleTargetHandle`, capture source handle before lazy updates, rerun cardinality/compatibility, and never reinterpret an explicit wrong socket. Require both pointer-ownership CSS regression and a behavioral null-node/null-handle handler test; source-string-only checks are insufficient.
- When a node evolves from self-contained to accepting declared inputs, remove every older cleanup effect that filters all edges by target node kind. Centralized port/compatibility normalization must own validity; a blanket `edges.filter(edge => !idsOfKind.has(edge.target))` can silently erase a valid edge immediately after `onConnect`. Diagnose with a working-vs-broken physical trace at callback boundaries: prove `onConnect`, functional state before/after, connect-end validity, normalization/pruning, and final DOM edge IDs. Remove all temporary telemetry before packaging and add a regression forbidding the stale blanket writer.
- Before changing Seedance provider composition, read the canonical Hermes Seedance skill under `Hermes/AI Video/Director/skills/seedance/SKILL.md`; compiler-local assumptions are not the prompting authority. A connected semantic Video request may compile with blank authored action, but must state that action/performance remains unspecified rather than inventing it. Connections own visual authority only.
- Seedance semantic completion is exact-tag and domain-based. Keep provider reference mapping and global gates unconditional; preserve authored text verbatim; add only missing authority/continuity domains. Bound Wardrobe overrides Character clothing authority, while an unbound Character owns its reference wardrobe/accessories. Repeat Character+Wardrobe and used Location/Element tags at point of use, isolate pair ownership, keep props out of Location geometry, and place exclusions in final `NEGATIVE PROMPT`. Validate through the exact saved-graph Composed Provider Prompt, not source-string counts alone.
- The visible Seedance Composed Prompt is the semantic master prompt: retain exact platform/Canvas `@tags` and never expose or double-tag raw ordinal tokens. A separate hidden provider adapter may translate only physically selected references to `@ImageN`/`@VideoN`/`@AudioN` in the exact submitted URL-array order. Omitted/unreferenced media and manual text/text-only Style never receive invented slots.
- Edited Storyboards declare `N SHOTS`, `N-1 HARD CUTS`, total/per-shot durations, then use `SHOT 1/2/...` containers with cumulative timecodes; `HARD CUT.` appears only between shots. Internal BEATS, pans, focus changes, acting, and action inside one panel remain one shot. Preserve authored panel line breaks. A complete structured master is returned byte-for-byte; partial structured prompts receive only missing sections. Do not treat semantic tags alone as narrative action.
- Storyboard per-slot Revamp and Revamp All are AI actions using the selected model only after click. Supply every rewrite with sequence context and preserve semantic tags, SHOT/BEAT structure, hard cuts, dialogue, locks, duration/shot-size/camera metadata, and continuity; if already complete, return byte-for-byte unchanged. Keep the per-slot action above the textarea hit layer with a pointer-transparent tray and pointer-active button so the cursor and click reach the Wand without triggering rewrite on model selection.
- Do not load every branch for every task; that recreates the monolith.
- Do not duplicate a normative rule across product, feature, design, API, or skill documents.
- Do not treat linked dependencies as permission to modify them.
- Do not claim a planned capability is implemented.
- Do not refactor large source files merely because documentation boundaries now exist.
- Do not promote a candidate with failing or unrun verification.
- Do not rebuild or re-sign an existing Codex candidate to make inspection convenient; inspect the exact artifact first.
- Do not bypass a native file chooser or foreground-approval failure. The observed absence of Storyboard Image Layout UI/CSS is packaged evidence, not permission to rebuild; a blocked native chooser is incomplete visual coverage, not evidence of success or failure of the requested interaction.
- Preserve the approved fallback and all current Hermes source edits during candidate inspection. Stop before approval or promotion.

## Approved shared node inset and prompt ownership — 13 October 2026

- General outer padding and gaps between fields are separate owners. Standard node prompt/body inset is 12px; top and bottom match horizontal inset. Shared generator footers use 8px on all sides, independently of existing control gaps. Preserve the user-approved Storyboard footer and grouped speaker/sample controls.
- Standard generation and standalone Prompt fields start at three rendered lines, grow through Enter or wrapping to seven, and shrink after deletion or widening. Boxed Description fields share equal 12px internal insets but retain their fixed three-line scrolling role. Specialized Storyboard shot editors retain their own field family.
- Standalone Prompt uses the existing LLM catalog selector and terminal circular Revamp action in a footer; no header Enhance toggle. Reuse existing model persistence, runtime and icon tokens.
- Empty Upload corners remain rounded at the terminal bottom. Input/output real handles and hover rails appear behind opaque node bodies when covered, with existing unoccluded reveal and connection geometry retained.
- Installed batch evidence is in Codex Apps/Prism/Prompt And Node Insets Native Evidence.json. Rendered regression checks passed; live visual acceptance remains user-owned and pending.
