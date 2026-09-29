# Storyboard Revamp All — Coherent Batch Design Review

- Date: 2026-08-23
- Verdict: **APPROVED FOR DEVELOPER**
- Review type: read-only pre-code design and interaction contract
- Integration/source owner: Developer
- Source writer: Developer only
- Designer artifact owner: Designer, this report only

## Design read

Prism Storyboard is a compact, fixed-width planning surface for an ordered cinematic sequence. `Revamp Shot` improves one editable panel with sequence context. `Revamp All` must improve all eligible panels as one coherent sequence, using one paid provider request and one atomic result. The existing flat dark Prism identity, compact footer control, paid-request disclosure, animated status ellipsis, panel order, locks, transitions, timing, tags, dialogue, camera metadata, connected authorities, and validation rules are protected.

This is an interaction and contract change, not a visual redesign. Hallmark routing is read-only and limited to hierarchy, interaction states, accessibility, content honesty, and design-system coherence. shadcn and Taste are not triggered: Prism has an established component language and no new visual direction is requested.

## Non-competing scope and evidence boundary

Inspected only the user-authorized Revamp surfaces:

- `work/src/renderer/src/AppNext.tsx` — Revamp caller, lines 3279–3311
- `work/src/shared/storyboardRewrite.ts` — full file
- `work/src/shared/storyboardRewrite.test.ts` — full file
- `work/src/renderer/src/UtilityNodes.tsx` — Storyboard busy state and Revamp/status markup, lines 397–559
- `work/src/renderer/src/styles-next.css` — Storyboard status rules, lines 1793–1797
- `docs/features/nodes/workflow/storyboard/storyboard-node.md`
- `skills/prism-foundry-product-standard/SKILL.md`
- Designer supervision and Prism design context

Legacy `App.tsx` and `styles.css` were not inspected. Duration-selector implementation outside the listed Revamp/status surfaces was not inspected. No source, tests, feature docs, task skill, profile, Obsidian content, build, live UI, or provider was changed or operated.

Stable read snapshot is identified by SHA-256:

- `AppNext.tsx`: `50e48e4015859965e938141f4815aab2467a25132528195c91979b0844c8e089`
- `storyboardRewrite.ts`: `dc8305cb1a11a4b6085bcc426dc9b53002b616164f69f621b6ddf7d40c0e5b9a`
- `storyboardRewrite.test.ts`: `65e909fb76c8a9bda341affbab84e3f92ab8691844de4b58d8024896bbc58854`
- `UtilityNodes.tsx`: `43dcbe4c7c0cea73945334dbe52bedfd0da58b7563a121495f6c9686ea06b75b`
- `styles-next.css`: `a4ac80ba3b71eade566b91f8a25cf6118ffd9882f9c9b6de6f2faac921f7a55e`
- `storyboard-node.md`: `c3c2330151e60fc866310844a30545d45ccc64f797c5b0da0d32a9199411b4b2`
- task-local skill: `5a196eb39042d9b7dccf145eb6085839dbbd8144f567710ef330e43658ab1e4d`

Dependency graph is frozen: this report → Developer implementation in the authorized Revamp files → focused automated evidence and mocked manual interaction evidence → one bounded Designer re-review → build. Developer’s simultaneous duration-selector lane is disjoint and must not be consumed or reviewed here.

## Accepted interaction contract

1. **Controls and disclosure**
   - Preserve the current footer wand + `All` control, accessible name `Revamp All`, compact geometry, and tooltip text: `Revamp sends a paid AI text request to the selected provider.`
   - Preserve `Revamp Shot` as one panel and exactly one paid provider request.
   - Do not add a modal, confirmation, progress dialog, provider transcript, or extra click.

2. **Target set and full ordered context**
   - For `Revamp All`, the editable target set is every panel that is unlocked, non-empty, and not already a complete structured prompt.
   - Locked, empty, and complete structured panels are not targets. They remain read-only sequence context and must stay visibly and byte-for-byte unchanged.
   - The single batch request must include all panels in their Storyboard order, including target and read-only panels, with panel identity, prompt, duration, shot size, camera, lock state, and normalized Cut/Continue/final-boundary semantics. It must also include the applicable connected-context authority and preservation rules.
   - The provider must return one complete prompt for every target panel, not diffs, fragments, explanations, or scene-by-scene debug output.

3. **Internal batch response contract**
   - Use a strict internal manifest keyed by stable panel identity, or an equally strict ordered equivalent. Require exact target cardinality, unique IDs, expected order, non-empty complete prompt strings, and no extra records.
   - Treat the manifest syntax as transport-only. JSON, IDs, field labels, markdown fences, parsing diagnostics, and hidden connected-context syntax must never enter a visible panel prompt, status, tooltip, or error.
   - Validate the complete batch before mutating any panel. Run all existing per-panel tag, hidden-context, ordinal-token, transition/meta-commentary, complete-structured, and preservation validation against each returned prompt; add sequence-level validation for exact target coverage and order.

4. **One call and one atomic lifecycle**
   - `Revamp All` performs exactly one `window.prism.assistant.rewrite(...)` paid call.
   - There is no per-panel loop of provider calls and no silent fallback to per-panel calls after provider, parse, or validation failure.
   - Enter running state once before the call. Resolve once to success/unchanged or once to the generic error. Do not emit per-panel progress or partial-success states.
   - On missing, malformed, duplicate, extra, out-of-order, empty, or individually invalid output, apply none of the batch. Preserve every panel exactly and show only `Could not revamp, check connection.`

5. **Running count and compact status**
   - Running copy is `Revamping 1 panel` or `Revamping N panels`, where N is the editable target count only.
   - The existing CSS one/two/three-dot ellipsis remains the only animation. Preserve its bounded width, row height, compact `8px`/`400` hierarchy, reduced-motion stable ellipsis, border rhythm, and existing status placement.
   - Locked, empty, and complete panels remain visible while running, but their exclusion from N is intentional. Do not show a total-panel denominator or per-panel counters that imply they will change.

6. **Terminal copy**
   - Changed batch: `Storyboard revamped.`
   - Valid batch with no text changes: `Storyboard unchanged.`
   - No provider call because every otherwise eligible prompt is already complete structured content: `Storyboard already complete.`
   - No eligible panel because prompts are empty or locked: preserve the existing actionable preflight copy `Write a prompt or unlock a panel first.`
   - Provider selection, connection, transport, parse, or validation failure: exactly `Could not revamp, check connection.`
   - Do not include provider/model names, counts changed, per-panel completion, JSON errors, or debug details in Storyboard status.

7. **Accessibility and activation safety**
   - During a Revamp request, expose the Storyboard as busy (`aria-busy="true"` on the stable Storyboard container or an equivalent scoped owner).
   - Keep the existing Revamp controls mounted in place. Disable both `Revamp All` and every `Revamp Shot` trigger while that Storyboard request is active; prevent activation in the caller as well as in rendered button state so two activations in the same render frame cannot create duplicate paid calls.
   - Do not move focus to the status, replace the initiating button, or close/reopen the editor. Verify focus remains on or returns predictably to the same initiating control after the terminal state.
   - Give the single stable status region `role="status"`, `aria-live="polite"`, and `aria-atomic="true"` so running, success, unchanged, preflight, and generic failure copy is announced once per lifecycle.
   - Native button disablement, caller-level in-flight exclusion, and one stable lifecycle are all required; UI disablement alone is not sufficient duplicate-call protection.

8. **Preservation boundary**
   - Preserve Cut/Continue, panel order/count/IDs, timing, duration-budget semantics, shot size, camera selection, locks, complete structured content, empty content, semantic tags, exact dialogue and speaker attribution, SHOT/BEAT/HARD CUT structure, connected context, continuity, British spelling, and all current validation semantics.
   - `storyboardNeedsCompile` may change only after a fully valid atomic batch actually changes one or more target prompts, following existing behavior. It must not change for failure, preflight, already-complete, or valid-unchanged outcomes.

## Ranked findings and required implementation decisions

1. **[P1 · Defect] Revamp All currently performs N paid provider calls.**
   - Axis: interaction contract, content coherence, trust
   - Evidence: `AppNext.tsx:3298–3302` loops over targets and calls `assistant.rewrite` once per panel.
   - Impact: violates the one-call requirement, exposes users to multiple paid operations, and asks the provider to produce disconnected outputs despite repeated sequence context.
   - Required direction: split the one-panel and all-panel paths. Keep the one-panel path one call; make the all-panel path construct one full ordered batch and issue exactly one call. No fallback loop.
   - Confidence: high

2. **[P1 · Defect] Current validation/apply helpers do not define an all-or-none batch response boundary.**
   - Axis: interaction states, content honesty, preservation
   - Evidence: `storyboardRewrite.ts:273–317` validates and applies individual prompt strings from a map; `AppNext.tsx:3299–3301` accumulates results after each request.
   - Impact: the current shape cannot prove exact batch coverage, reject missing/extra/duplicate panel records as one unit, or guarantee that internal manifest syntax never reaches prompts.
   - Required direction: add a strict internal batch parser plus sequence-level validator; validate every record and every returned prompt before one atomic apply. Any failure produces zero panel mutations and the exact generic error.
   - Confidence: high

3. **[P1 · Defect] Busy and status semantics do not yet prevent duplicate paid activation or announce lifecycle changes.**
   - Axis: accessibility, interaction states
   - Evidence: `UtilityNodes.tsx:424, 538, 557–559` derives `nodeBusy`, but Revamp buttons are not disabled by it; status has no live-region semantics; the caller has no visible in-flight exclusion.
   - Impact: double activation can create duplicate paid calls, concurrent Shot/All calls can conflict, and assistive-technology users may miss running/error state.
   - Required direction: disable all Revamp triggers for the active Storyboard, add caller-level in-flight exclusion, scoped busy semantics, and one atomic live status region while preserving focus and geometry.
   - Confidence: high

4. **[P2 · Defect] Current completion copy is provider/model verbose and panel-accounting oriented.**
   - Axis: hierarchy, content honesty
   - Evidence: `storyboardRewrite.ts:319–322` includes provider/model labels and per-panel changed/complete counts; `AppNext.tsx:3287` uses a long implementation-facing preservation sentence.
   - Impact: status becomes louder than its compact footer role and reports implementation detail instead of the sequence-level outcome.
   - Required direction: use only the exact terminal copy defined above. Keep provider diagnostics in Connections, not Storyboard status.
   - Confidence: high

5. **[P2 · Risk] A batch built from target prompts alone would conceal why N is smaller than the visible panel count.**
   - Axis: hierarchy, content comprehension
   - Evidence: target filtering at `storyboardRewrite.ts:254–259` excludes locked, empty, and complete prompts; all panels remain rendered at `UtilityNodes.tsx:512–549`.
   - Impact: users could infer a lost or skipped scene if status count and visible count differ without a stable rule.
   - Required direction: define N exclusively as editable targets, retain every excluded panel visibly unchanged as ordered read-only context, and avoid total denominators or per-panel churn. Validate this with mixed-state fixtures.
   - Confidence: high

## Acceptance matrix

| Requirement | Developer implementation acceptance | Automated evidence required before build | Manual/mock acceptance required before build |
|---|---|---|---|
| Revamp Shot remains one request | One target prompt, full sequence context, one provider invocation | Mock invocation count = 1; unchanged existing preservation tests remain green | Activate one Shot in a stubbed/dev fixture; only that editable panel changes |
| Revamp All is one coherent request | One ordered batch containing all panel context; outputs for all and only targets | Mock invocation count = 1 for 2–8 panels; request snapshot proves order and read-only context; explicit assertion forbids fallback calls | Mixed cinematic sequence returns mutually coherent panel prompts from a deterministic stub |
| Target count is truthful | N = unlocked + non-empty + incomplete structured prompts | Table tests covering locked, empty, complete, mixed, one-target, and all-target cases | At 315px node width, mixed panel states visibly stay unchanged while status reports target N |
| Atomic apply | Parse and validate entire response before one state mutation | Missing, malformed, duplicate, extra, reordered, empty, invalid-tag, ordinal, hidden-manifest, and transition-meta fixtures all assert original panel array unchanged | Stub one invalid record among valid records; observe generic error and zero prompt changes |
| One lifecycle | One running update and one terminal update; no per-panel progress | State-transition test asserts running → one terminal state only | Observe no per-panel flicker or count churn with slow deterministic stub |
| Exact status copy | Use only contracted running/preflight/success/unchanged/error strings | Exact-string assertions; assert provider/model names and manifest terms absent | Inspect longest running/error strings at 315px node, default canvas zoom, representative zoom, and 440px app width |
| Busy and duplicate-call safety | Scoped busy state, all Revamp buttons disabled, caller in-flight guard | Same-frame double-click/keyboard activation and Shot-while-All tests still produce one provider call | Keyboard activate Revamp All twice rapidly; focus stays stable and only one stub request occurs |
| Announcements | One stable atomic polite status region | DOM assertions for `role=status`, `aria-live=polite`, `aria-atomic=true`, scoped `aria-busy`, and native disabled state | VoiceOver check: running and terminal copy each announced once; no focus jump |
| Internal structure never leaks | Parse transport separately; assign only validated prompt strings | Assert JSON keys/fences/IDs/manifest labels never appear in panels or statuses on success and failure | Use a stubbed fenced/malformed response; UI shows only generic error |
| Preserve Storyboard semantics | Read-only context remains exact; existing validators remain authoritative | Existing Storyboard rewrite suite plus new batch tests cover tags, dialogue, SHOT/BEAT/HARD CUT, transitions, locks, metadata, order, timing, and complete structured prompts | Compare all locked, empty, complete, and metadata controls before/after mixed success and failure |
| Compile dirtiness remains truthful | Dirty only when valid atomic batch changes prompt text | Changed, unchanged, preflight, complete, and failure assertions for `storyboardNeedsCompile` | Observe unchanged/failure fixture leaves compiled/stale indication unchanged |

Automated evidence is focused source behavior only: the batch helper/parser/validator tests, Revamp caller/provider-mock tests, and Storyboard markup/status tests. Developer should run these focused gates and typecheck before the manual mocked acceptance. Do not perform live paid inference. Build starts only after both focused automated evidence and the bounded manual/mock acceptance above pass.

## Accepted existing behavior

- Existing wand + `All` control, accessible name, paid-request tooltip, compact footer placement, and Storyboard visual identity are accepted.
- Existing animated one/two/three-dot status treatment and reduced-motion fixed ellipsis are accepted from source evidence, pending rendered verification.
- Existing target exclusion for locked, empty, and complete structured prompts is the correct basis for editable N.
- Existing complete-structured byte-for-byte protection, tag and hidden-context validation, Cut/Continue context, timing, camera, dialogue, lock, and order preservation rules remain governing behavior.
- Existing generic visible failure copy `Could not revamp, check connection.` is accepted and required.

## Unverified / manual checks

- No rendered Storyboard, keyboard flow, VoiceOver output, focus behavior, animation, reduced-motion rendering, or narrow-window layout was inspected in this pre-code review.
- No provider request was sent. Provider parsing, billing, latency, and malformed-response behavior are unverified until deterministic mocks pass; live paid inference is not required or authorized.
- The compact status row must be manually checked at the canonical 315px node width, default canvas zoom, a representative zoom level, and 440px application width using: one target, maximum legal target count, generic error, changed success, unchanged, already complete, and mixed locked/empty/complete panels.
- Verify that dots animate without text/row shift, reduced motion shows a stable ellipsis, the status does not dominate footer controls, focus remains stable, and every excluded panel remains visibly unchanged.
- Designer re-review is bounded to the stable post-code Revamp caller, batch helper/tests, Revamp/status markup, Storyboard status CSS, and the evidence listed in the acceptance matrix. Do not include Developer’s duration-selector lane unless it directly changes these surfaces.

## Developer handoff

- Apply: findings 1–5 and the exact accepted interaction contract.
- Preserve: current Prism identity, Revamp controls/disclosure, Revamp Shot single-call behavior, compact dots, generic failure copy, complete/locked/empty panels, all Storyboard semantics and validation rules.
- Evidence gate: focused automated tests + deterministic mocked manual acceptance before build; no live provider inference.
- Re-review target: one stable Revamp-only snapshot and the bounded states named above.

# APPROVED FOR DEVELOPER

The design and interaction decisions are complete enough for Developer to implement without inventing UI behavior. Approval is for implementation against this contract, not acceptance of the current N-call behavior and not approval to build, package, call a provider, or modify disjoint duration-selector work before the evidence gate passes.

---

# Post-code stable snapshot review

## Stable gate and bounded scope

- **Stable snapshot:** `/tmp/prism-storyboard-duration-revampall-prebuild-snapshot.json` (`Prism Storyboard duration + coherent Revamp All pre-build`).
- **Hash gate:** **PASS**. All **20/20** manifest-listed files matched their declared SHA-256 values before review; no moving-target mismatch was found.
- **Scope:** one final read-only source/evidence audit of manifest-listed changed files and directly necessary existing Storyboard tokens. Legacy `App.tsx` and `styles.css` were not inspected. No build, test, UI, provider, source, plan, canonical doc, skill, profile, Obsidian, or package action was performed. This existing Designer report is the only Revamp artifact changed.
- **Routing:** Designer Supervision + Iris / Design Inspector + Hallmark Audit, preserving the established Prism product system.

## Consolidated final finding batch — Revamp All

### RA-01 — Batch validation can still admit visible internal JSON/ID leakage

- **Priority/type/confidence:** **P1 · defect · high**.
- **Axis:** content honesty, strict transport boundary, atomic validation.
- **Evidence:** the outer parser is strict about exact top-level and record keys, cardinality, order, uniqueness, and non-empty prompt strings (`storyboardRewrite.ts:322–337`). Before atomic apply, each prompt is validated (`398–412`), but `validateStoryboardRewrite` rejects only selected hidden-manifest signatures such as `CONNECTED CONTEXT MANIFEST`, `PANEL ID:`, `anchor=…role=…`, and a `"panels":` key (`243`, `352–379`). It does not reject the actual stable target IDs, generic transport field labels such as `"id":` / `"prompt":`, or arbitrary JSON objects embedded inside an otherwise valid prompt string. For example, a strict outer response can contain an escaped inner prompt object with an internal ID and pass the current parser/validator path. `storyboardRewrite.test.ts:189–220` checks one `PANEL ID`/`{"panels":[]}` sample, but not generic field-label, stable-ID, or escaped-inner-JSON leakage.
- **Contract impact:** fails the approved requirement that JSON, IDs, field labels, manifest syntax, and parsing transport never enter a visible panel prompt. Atomic apply-none is sound for errors that are detected, but this leakage class is not detected.
- **Direction:** before atomic apply, reject transport-shaped JSON/object syntax, batch field labels, and every internal target/context panel ID in returned prompt strings, without blocking legitimate authored prose. Add focused fixtures for escaped inner JSON, bare/quoted stable IDs, `"id"` / `"prompt"` labels, fenced and unfenced transport fragments, and prove the original panel array remains unchanged with only the generic error exposed.

## Accepted post-code criteria

- **One paid call:** `AppNext.tsx:3301–3308` contains one call in the Shot branch and one call in the All branch; Revamp All has no target loop or fallback. Revamp Shot remains one call.
- **Full ordered context:** `storyboardRewrite.ts:277–315` includes every panel in order with stable ID, full prompt, duration, shot size, camera, lock/editable state, normalized Continue/Hard Cut/final boundary, and panel-specific connected context. Locked, empty, and complete panels remain read-only context.
- **Strict batch shape and atomicity:** exact target count/order/unique IDs/no extras/non-empty strings are enforced by `parseStoryboardBatchResponse`; all target prompts are validated before one immutable apply and one `setNodes` commit (`storyboardRewrite.ts:322–412`; `AppNext.tsx:3307–3325`). This passes except for RA-01’s leakage gap.
- **Busy/duplicate-call safety:** the node-scoped in-flight set guards before any paid call and is added synchronously before the first await (`AppNext.tsx:3279–3297`); all Shot and All triggers disable from scoped `nodeBusy`, the stable Storyboard container exposes `aria-busy`, and the single status region is polite/atomic (`UtilityNodes.tsx:424`, `486`, `538`, `557–559`). Focus stability remains manual because no behavioral DOM evidence was supplied.
- **Truthful copy:** running count uses editable targets only; success, unchanged, already-complete, preflight, and generic error copy match the approved contract (`AppNext.tsx:3285–3327`). No provider/model/count/debug text is emitted into status.
- **Compact layout:** the footer remains mounted and compact; the node remains governed by the canonical 315px width. Status stays after the footer with 3px/8px padding, one top border, 8px/400 at 1.25 line-height, bounded terminal ellipsis, and reduced-motion final ellipsis (`UtilityNodes.tsx:552–559`; `styles-next.css:1779–1797`). The new 29px helper is above the footer, so source ordering introduces no empty dead band or control shift.

## Automated evidence strength

- **Strong:** pure helper coverage directly executes mixed target classification, ordered full-context construction, strict cardinality/order/extra/duplicate/empty/fence/commentary rejection, per-panel validation, immutable failure, atomic valid apply, and read-only panel preservation (`storyboardRewrite.test.ts:132–222`).
- **Moderate-to-weak for caller/UI behavior:** `productSurface.test.ts:854–893` is source-string inspection. It supports branch/call-count, guard, disabled markup, live-region, copy, CSS, and reduced-motion declarations, but it does not execute rapid same-frame activation, focus retention, live announcements, status wrapping, ellipsis paint, or actual call cardinality. RA-01 also shows the current pure leakage fixture set is incomplete.

## Final verdict

**BLOCKED — RA-01**

The one-call coherent batch, ordered context, strict outer parser, atomic apply, Revamp Shot preservation, busy guard, scoped status semantics, contracted copy, and compact layout are accepted from source/pure evidence. Build approval is blocked until RA-01 closes. The combined snapshot is also blocked by **PC-01**, detailed in the duration report.

## User-owned manual checks

- Rapid keyboard/pointer Revamp All reactivation and Shot-while-All: one deterministic stub request only; all paid Revamp triggers visibly disable; initiating focus remains stable through running and terminal state.
- VoiceOver: scoped busy state plus running and one terminal message announced once; no focus jump.
- Mixed editable/locked/empty/complete sequence: running N equals editable targets only; excluded panels and all metadata remain visibly unchanged on success, unchanged, and failure.
- Deterministic malformed/fenced/inner-JSON response: generic error only, zero visible prompt/status leakage, zero panel changes.
- At 315px, representative zooms, viewport edges, and 440px app width: running/error/success/unchanged/complete/preflight copy remains subordinate to footer controls, does not wrap into a height jump, and does not create a dead band.
- Helper plus running/error status: grid → helper → footer → status ordering remains balanced; ellipsis produces no visible shift; reduced motion shows a stable final ellipsis.

---

# Final blocker resolution

- **Stable snapshot:** `/tmp/prism-storyboard-duration-revampall-prebuild-snapshot-v3.json` (`Prism Storyboard duration + coherent Revamp All pre-build v3 — PC-01 and RA-01 repaired`).
- **Hash gate:** **PASS**. All **22/22** manifest-listed SHA-256 values matched before review.
- **Bounded scope:** RA-01 only, using the manifest-listed pure batch helper/tests, active caller, and directly affected static renderer evidence. No tests, build, package, UI, provider, source, canonical docs, skills, profile, or Obsidian actions were performed.

## RA-01 — Resolved

- **Transport rejection:** `validateStoryboardBatchPromptTransport` rejects fences, transport-shaped fenced/unfenced/object or escaped-JSON content, quoted/escaped transport field labels, exact internal target and read-only context panel IDs, and batch/manifest/parser/hidden-context terminology.
- **False-positive boundary:** focused pure coverage preserves ordinary prose containing non-transport uses of “prompt” and “boundary.”
- **Atomicity:** `applyStoryboardBatchResponse` builds a fully validated map before `applyStoryboardRewrites`; the escaped inner-transport fixture throws and proves the original panels remain unchanged. A second invalid-panel fixture likewise proves all originals remain unchanged.
- **Preserved contract:** the active caller still issues one Revamp All provider call, parses once, validates before the single immutable apply/`setNodes` commit, retains the node-scoped in-flight guard, and preserves the contracted busy, status, success/unchanged, and generic-error behavior.
- **Contract impact:** the final RA-01 blocker is closed; no accepted one-call, atomic, busy, status, compact-layout, or preservation behavior changed.

## Verdict

**RA-01 APPROVED FOR BUILD.**

## Remaining user-owned manual checks

- Deterministic fenced, unfenced, escaped-inner-JSON, transport-label, exact-ID, and parser/manifest-term responses: generic error only, zero visible leakage, zero panel changes.
- Rapid Revamp All reactivation and Shot-while-All: one stub request; controls visibly disable; focus remains stable.
- VoiceOver announces scoped busy plus one running and one terminal status; mixed read-only panels and metadata remain visibly unchanged.
- Retain the prior 315px/440px compact status, helper/status ordering, ellipsis, and reduced-motion checks.
