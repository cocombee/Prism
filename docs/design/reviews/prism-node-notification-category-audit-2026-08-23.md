# Prism Node-Notification Category Audit — 2026-08-23

## Audit identity and authority

- Role: Designer, read-only design authority.
- Review type: category-first legacy audit before system-wide propagation.
- Integration/source owner: Developer.
- Source writer: Developer only; Developer was not writing concurrently during this audit.
- Designer artifact owner: Designer, this report only.
- Specialist routing: Designer Supervision + Iris / Design Inspector + Hallmark Audit, all read-only. shadcn and Taste were not triggered.
- Protection: Prism's existing UI is protected legacy evidence, not automatic design approval. The report path was already `POST_CUTOFF_RESERVED` under the Iris provenance guard.
- Legacy files not inspected: `work/src/renderer/src/App.tsx`, `work/src/renderer/src/styles.css`.
- No source, tests, canonical docs, task skill, profile, Obsidian content, build, package, provider, or live UI was changed or operated.

## Stable read snapshot

SHA-256 at review time:

- `work/src/renderer/src/AppNext.tsx`: `dcb45bb833bc98959030d3a9e0a9833e946250acfec4f0cc43a24e9614beaf22`
- `work/src/renderer/src/NodeCard.tsx`: `2fc24d14cbd297ce6cbe32ef83b58ea86c75495d110382173cc775ab9fc41b79`
- `work/src/renderer/src/UtilityNodes.tsx`: `2477b70f1b2261616972c1664602e51900a264b8a72a77cc35228512cd607ea1`
- `work/src/renderer/src/styles-next.css`: `06246d6fdbf9de94154022e3f5174344aafc8146f43ae3ae5b0ac3f950e112ac`
- `work/src/renderer/src/productSurface.test.ts`: `dc8c10e0e01c27cc4e996ff7aeeae47d51b0955d12e65849b48e6e8e359d21b9`
- `docs/design/visual-and-interaction-standard.md`: `9b815d5c7bc9e280734e8f5c72c95afd68e4f834daf34558f98de928693ad1c0`
- `docs/CURRENT-STATE.md`: `1a6a9e2aaba8ae79bda4eb595080bafe57ddffc50133cf60d693cde4a35f2f79`
- `skills/prism-foundry-product-standard/SKILL.md`: `3aa3de30d1fde564ebedb084edb18024f3e44b62da7eaa050d430efa125b933c`

Rendered evidence:

- `/Users/mrkokom/Library/Application Support/Hermes/composer-images/composer_2026-08-23_11-57-16-105_0113b1.png` — 1342 × 448 px crop of the Storyboard helper/footer/status region.
- `/Users/mrkokom/.hermes/cache/images/computer_use_e9466f74a73f4bce8c12ba221a562101.png` — 1456 × 925 px Prism canvas view containing the Storyboard node.

The screenshots visibly prove only the Storyboard duration helper, footer controls, and terminal `Storyboard revamped.` state. They do not prove running, error, Assistant, generic node-status, readiness, focus, live announcement, dismissal, reduced motion, or constrained-width behavior.

## Active-boundary discrepancy

`AppNext.tsx:116` imports `NodeCard` from `./NodeCardNext`, and `productSurface.test.ts:5` also reads `NodeCardNext.tsx`. The user-authorized list named `NodeCard.tsx`, which was inspected, but that file is not the NodeCard imported by the active successor renderer at this snapshot.

This audit therefore distinguishes:

- inspected category evidence in `NodeCard.tsx`;
- active successor ownership in `NodeCardNext.tsx`, proved by `AppNext.tsx` and the active product-surface test;
- an uninspected active `NodeCardNext.tsx` implementation that must not be assumed identical to `NodeCard.tsx`.

System-wide propagation is blocked until Developer confirms the active NodeCard target and supplies the active file as part of the frozen implementation snapshot. Editing only `NodeCard.tsx` would not satisfy active-next-generation propagation at this snapshot.

# Category inventory before approval

## Included instances

| ID | Instance / wrapper | Scope and eligibility | Current evidence | Initial classification |
|---|---|---|---|---|
| I-01 | Global/top transient connection notice, `.connection-error-toast` | Canvas-level connection removal, sequence cancellation/failure, and similar short-lived graph feedback | `AppNext.tsx:656, 833–837, 1713–1717, 3865–3879, 3934–3938, 5725`; `styles-next.css:689–692` | Split |
| I-02 | Global media error toast, `.connection-error-toast.media-offline-error-toast` | Canvas-level actionable missing-media error | `AppNext.tsx:679, 2003–2006, 6354`; same base toast CSS | Keep persistent error semantics; split from transient information |
| I-03 | Project inline notice/error | Project/Home operations, not node-local; useful global analogue | `AppNext.tsx:654–655, 1138–1191, 1552–1556, 6063–6064`; `styles-next.css:1333–1338` | Split; analogue only, not a node propagation target |
| I-04 | Save label | Global transient save-state text, not a notification row | `AppNext.tsx:5538–5540`; `productSurface.test.ts:1877–1879`; `styles-next.css:80–90` | Keep outside node-notification category |
| I-05 | Generic `.node-status` | Shared node-level status in inspected `NodeCard.tsx`; candidate owner for generators, Character, Prompt Enhance, and other studio nodes | `NodeCard.tsx:972–977, 1440–1444`; `styles-next.css:685–688`; `productSurface.test.ts:316–320` | Split and repair |
| I-06 | Generic node running progress | `queued`/`running` only: preparing, generating, batches, sequence shots, completion-set work | `AppNext.tsx:1350–1353, 2821, 3796, 3808–3812, 3887–3891`; generic status wrapper | Keep semantics; repair shared geometry/accessibility |
| I-07 | Generic transient informational/success completion | Copy/import/connect/ready/complete/stopped and similar action confirmations stored in `data.progress` | Examples: `AppNext.tsx:1927–1930, 2295–2313, 2531–2563, 2618–2649, 3835–3847, 3945–3948`; generic status wrapper | Replace persistent legacy behavior with transient lifecycle |
| I-08 | Generic persistent actionable errors | Provider access, requirements, invalid input, interrupted/failed generation, failed sequence | Examples: `AppNext.tsx:2495–2504, 2764–2788, 3762–3790, 3853–3861, 3934–3938`; `.node-status.is-error` | Keep persistence; repair accessibility and shared geometry |
| I-09 | Header readiness pills | Persistent `Ready`, `Face Required`, `Element Required`, `Location Required`, `Style Required`; editor `Cancel` action | `NodeCard.tsx:968–969, 1207–1208`; `styles-next.css:524–528`; visual standard: shared 25px readiness category | Keep as separate persistent readiness category |
| I-10 | Persistent readiness/warnings outside the pill | Account availability, upstream/stale-state or other guidance that remains true until input changes | `UtilityNodes.tsx:593–601`; `productSurface.test.ts:1243–1248`; source assigns warning/error state in node data | Split from notifications; persistent state guidance |
| I-11 | Storyboard duration helper, `.storyboard-feedback-row.storyboard-duration-helper` | Derived Single Sequence budget guidance, including locked conflict; remains while condition remains true | `UtilityNodes.tsx:552`; `styles-next.css:1779–1781`; `productSurface.test.ts:845–857, 897–907` | Keep separate from notification lifecycle; repair announcement only if needed |
| I-12 | Storyboard lifecycle status, `.storyboard-feedback-row.storyboard-status` | Running, preflight, terminal success/unchanged/already-complete, actionable error | `AppNext.tsx:3279–3331`; `UtilityNodes.tsx:559`; `styles-next.css:1779, 1794–1798` | Split; running/error keep, terminal success replace |
| I-13 | Assistant node status, `.assistant-status` | Assistant running, completion, and error | `AppNext.tsx:5291–5309`; `UtilityNodes.tsx:584–602`; no `.assistant-status` rule found in `styles-next.css` | Replace with approved shared subcategories |
| I-14 | List item pending/generating/failed cards | Item state inside list content, not a node notification wrapper | `UtilityNodes.tsx:109–114`; related List CSS/tests | Keep outside notification category; state card semantics remain local |

## Excluded from propagation

- Duration-budget guidance is persistent state guidance, not success/error notification chrome.
- Header readiness pills are persistent compact state labels, not transient notices.
- Save state is application-shell state, not a node notification.
- List pending cards are item-state content, not a notification row.
- Tooltips, model availability copy, empty states, placeholders, and connected-input fidelity rows are not notification instances.

# Approved category contracts

The legacy umbrella `progress/error/status` is rejected as one visual category. It must split by semantics and lifecycle before propagation.

## C-01 — Global/top transient notice

- Eligibility and semantics: short-lived, non-blocking graph/application feedback after a completed action or automatic reconciliation. No unresolved user action is required.
- Typography and vertical geometry: retain the global toast scale, not node-row geometry: current 12px, regular 400, minimum 42px, 9px/10px inset is acceptable for the canvas-level placement.
- Color/surface/border: informational/success feedback must not inherit the red error surface merely because it reuses `.connection-error-toast`. Use Prism's restrained neutral/purple informational treatment. Do not invent persistent green.
- Placement: fixed/absolute top-center canvas notice below the top bar, viewport-safe.
- Lifetime/dismissal/collapse: keep the established 5200ms auto-dismiss at `AppNext.tsx:833–837`, retain explicit close, and conditionally unmount the complete wrapper so no dead band remains.
- ARIA/focus: informational/success uses one polite atomic status; actionable interruption may use alert semantics. Never move focus. Close remains keyboard reachable with a visible focus state.
- Current implementation decision: **split**. Keep lifecycle/placement; repair semantic color and role. The same red `role="alert"` wrapper must not represent both informational reconciliation and errors.

## C-02 — Node running progress

- Eligibility and semantics: only while the exact node request is queued/running. Includes preparation, generation, batch index, sequence shot, Assistant rewrite, and Storyboard revamp. It ends when running ends.
- Typography and vertical geometry: 8px, weight 400, line-height 1.25; one-line minimum 28px; `padding: 0 8px` or the nearest shared horizontal inset; flex-centered. Two-line legal copy expands naturally. Do not use fixed two-line height. Spinner/ellipsis may add horizontal anatomy but not new vertical density.
- Color/surface/border: restrained purple/neutral progress; one divider or local status surface consistent with placement. No green.
- Placement: stable status slot immediately adjacent to the owning node's action/footer region. It must not overlay content or reorder controls.
- Lifetime/dismissal/collapse: exists only while queued/running; no manual dismissal; wrapper unmounts/collapses on terminal transition unless replaced momentarily by a terminal notice or persistently by an actionable error.
- ARIA/focus: stable `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; owning node/container exposes scoped `aria-busy`. No focus movement. Reduced motion keeps a stable final ellipsis/spinner alternative.
- Current implementation decision: **keep semantics, repair geometry/accessibility, propagate**. Storyboard's bounded ellipsis is the accepted motion analogue; generic nodes may retain a spinner if geometry remains stable.

## C-03 — Node transient informational/success completion

- Eligibility and semantics: an action completed, changed, copied, connected, imported, stopped, or was already complete/unchanged; no unresolved user action remains. Completed generated media is excluded where the media plus Rerun already communicates completion.
- Typography and vertical geometry: same 8px/400/1.25 and 28px one-line centering as C-02. Similar-sized text reuses the approved `4 / 4s` / `Save` control-height centering regardless of pill, band, or row shape.
- Color/surface/border: use the nearest approved transient notice's restrained neutral/purple information color. Success semantics do not authorize a permanent green row. No new semantic green.
- Placement: reuse the owning node's stable status slot; never add a second terminal band below an already sufficient result/media surface.
- Lifetime/dismissal/collapse: auto-dismiss after the established short 5200ms transient-notice lifetime. Then remove the entire wrapper and restore the exact prior node/footer boundary. A new run, edit, or error supersedes it immediately. Manual dismissal is optional only if it does not add persistent chrome.
- ARIA/focus: one polite atomic announcement; never focus the message and never steal/restore focus by remounting the initiating control.
- Current implementation decision: **replace** legacy persistent `data.progress` completion rows. Generator passive completion banners remain prohibited by the canonical visual standard.

## C-04 — Node persistent actionable error

- Eligibility and semantics: the node cannot proceed or a request failed and the user must change input, connection, permission, model, account state, or retry. Error copy must be provider-correct and actionable.
- Typography and vertical geometry: shared 8px/400/1.25; 28px minimum with `padding: 0 8px`; content-driven expansion for long messages. Do not clip or impose a fixed two-line block on one-line errors.
- Color/surface/border: restrained rose/red text and semantic surface/border; non-color error cue is required. Preserve Prism's flat dark system.
- Placement: owning node's stable status slot near the controls that can resolve it. Global missing-media failure may remain a top alert because its scope is not one node.
- Lifetime/dismissal/collapse: persistent until the error is corrected, superseded by a retry/running state, reset, or explicitly dismissed where a close control exists. Never auto-dismiss unresolved actionable errors.
- ARIA/focus: newly raised error uses alert/assertive semantics only once; subsequent unchanged renders must not re-announce. No automatic focus move. If a close action exists, it must have visible focus and an accessible name.
- Current implementation decision: **keep persistence, repair shared geometry/accessibility, propagate**.

## C-05 — Persistent readiness / warning state

- Eligibility and semantics: a condition remains true independently of one action lifecycle: Ready/Required, provider/account blocked, stale output, missing prerequisite, or non-blocking warning.
- Typography and vertical geometry: header readiness retains the approved 25px pill, 9px/400 text, `0 9px`, centered. Row-form warnings use the shared 28px, 8px/400 content-driven feedback geometry only when they occupy a row.
- Color/surface/border: required/incomplete is outline-only rose; ready/connected uses the existing restrained semantic fill; warning uses restrained amber/rose with a non-color label/icon. Do not use success-notice green or running purple interchangeably.
- Placement: readiness pill in the right side of the node header; row warning nearest the affected control/region. Do not convert a header condition into a bottom notification.
- Lifetime/dismissal/collapse: persists exactly while the condition is true. Normally not dismissible because dismissal would hide truth.
- ARIA/focus: static readiness is not a live region on initial render. A meaningful state change may announce politely once. Actionable `Cancel` remains a real button, not a status label.
- Current implementation decision: **keep header category; split row warnings from notifications; propagate only within their subcategory**.

## C-06 — Persistent derived guidance/helper

- Eligibility and semantics: deterministic guidance derived from current state, such as Storyboard duration budget/exhaustion. It is not action completion and not an error unless the underlying state is blocking.
- Typography and vertical geometry: keep `min-height: var(--node-control-height)`, `padding: 0 8px`, flex centering, 8px/400, line-height 1.25. One line remains 28px; a longest legal two-line locked conflict expands naturally.
- Color/surface/border: neutral input-region surface and divider; locked conflict may use restrained semantic rose.
- Placement: Storyboard grid → helper → footer. It must not move below the footer or merge with the transient lifecycle slot.
- Lifetime/dismissal/collapse: persists while derived condition remains true; unmounts and collapses when the condition no longer applies.
- ARIA/focus: polite status only when the derived guidance changes because of a user action; do not repeatedly announce on unrelated rerenders. No focus move.
- Current implementation decision: **keep and separate**. `storyboard-feedback-row` may remain shared geometry, but helper and notification lifecycles remain distinct.

# Instance decisions

## Storyboard helper versus notification

- `Panel 3 has 0s. Reduce an earlier panel or increase Duration.` is C-06 persistent guidance, not a notification. **Keep** its placement above the footer, neutral surface, divider, 28px minimum, and content-driven height.
- The screenshot shows the helper at the correct 8px/400 hierarchy and centered against the nearby `4 / 4s` and `Save` controls. It does not show the longest two-line string, so two-line acceptance remains unverified.
- The helper's persistent presence is correct only while the zero-duration condition remains true.

## Storyboard running, completion, and error

- `Revamping N panel(s)` is C-02. **Keep** the bounded one/two/three-dot animation, stable row slot, polite atomic live region, scoped busy state, and reduced-motion fixed ellipsis. The row exists only while busy.
- `Could not revamp, check connection.` and `Write a prompt or unlock a panel first.` are C-04 when user action is required. **Keep** persistence, use the shared 28px centered geometry, semantic rose treatment, and no focus movement.
- `Storyboard revamped.`, `Storyboard unchanged.`, and `Storyboard already complete.` are C-03. **Replace** the current permanent terminal row with a 5200ms auto-dismissed notice lifecycle; unmount/collapse the complete status wrapper afterward.
- `Storyboard revamped.` must not be a permanent green bottom row. `styles-next.css:1794` currently colors every non-error Storyboard status `#8dd5af`, and `AppNext.tsx:3324` stores terminal success in `data.progress` with no dismissal. The rendered images visibly reproduce this defect.
- After terminal dismissal, the footer must again be the node's terminal painted region with no empty border, padding, reserved minimum height, or dead band below it.

## Generic `node-status`

- The wrapper currently mixes C-02, C-03, and C-04. **Split** by semantic state before propagation.
- The inspected `NodeCard.tsx:973–977` correctly suppresses passive terminal status for canvas generators and Character, but allows terminal `visibleProgress` for other node kinds. That legacy asymmetry is not an approved category rule.
- `styles-next.css:685–686` uses `padding: 8px 9px` generally and `padding: 6px 9px` for canvas generators. **Repair** this invented vertical-density split: use a shared 28px minimum and `padding: 0 8px`/equivalent horizontal inset for one-line status text, with natural expansion when wrapping.
- Keep active spinner use only while running. Remove it at terminal state. Preserve semantic error surface for C-04.
- The active imported `NodeCardNext.tsx` must be inspected and mapped before Developer applies these decisions.

## Assistant node status

- Assistant's running `Rewriting with <model>…` is C-02; `Prompt enhanced` is C-03; provider/model/connection failure is C-04.
- `UtilityNodes.tsx:602` exposes one unclassified `.assistant-status`; no `.assistant-status` style was found in `styles-next.css`, and the wrapper has no status role, live region, atomic announcement, or scoped busy state. **Replace** this local exception with the approved shared state contracts.
- Running lasts only through the request. `Prompt enhanced` auto-dismisses after 5200ms and collapses. Error persists until correction/retry. Focus stays on the initiating Revamp control; the control remains mounted and visibly disabled during the request.

## Readiness and warnings

- Keep the shared 25px header readiness pill anatomy and semantic split. Readiness is persistent truth, not a notification.
- Keep actionable provider/account and stale-state guidance persistent while true; classify as C-05 or C-04 according to whether the user is blocked.
- Never propagate notification lifetime, green terminal color, or running animation into readiness/warning surfaces.

# Ranked findings

1. **[P1 · Defect · high] Active NodeCard source boundary does not match the authorized inventory file.**
   - Axis: scope integrity, propagation safety.
   - Evidence: `AppNext.tsx:116` imports `./NodeCardNext`; `productSurface.test.ts:5` reads `NodeCardNext.tsx`; the authorized/inspected file was `NodeCard.tsx`.
   - User impact: propagating into the wrong file can leave active next-generation nodes unchanged while tests or review appear to cover a legacy sibling.
   - Direction: Developer must identify the active imported NodeCard as the implementation target and return it in the stable snapshot. Do not edit both files speculatively.

2. **[P1 · Defect · high] Storyboard terminal success is a permanent green bottom row.**
   - Axis: lifecycle, color, wrapper collapse, hierarchy.
   - Evidence: `AppNext.tsx:3324`, `UtilityNodes.tsx:559`, `styles-next.css:1794`; both rendered images show `Storyboard revamped.` in green beneath the footer with the wrapper still painted.
   - User impact: a completed transient action becomes permanent status chrome, adds a second footer-like band, and visually overstates success.
   - Direction: classify terminal success/unchanged/already-complete as C-03; auto-dismiss at 5200ms; unmount/collapse the entire wrapper; use restrained neutral/purple transient styling, not persistent green.

3. **[P1 · Defect · high] Generic `progress` persists action confirmations on non-generator nodes and mixes three lifecycles.**
   - Axis: category coherence, interaction state truth.
   - Evidence: `NodeCard.tsx:973–977` suppresses terminal progress for generators/Character but exposes `visibleProgress` for other eligible nodes; `AppNext.tsx` stores many ready/imported/copied/stopped/completed confirmations in `data.progress` without one shared expiry.
   - User impact: equivalent actions leave different permanent rows depending on node kind, so legacy repetition propagates inconsistency.
   - Direction: separate C-02/C-03/C-04 state ownership. Only running is process-bound; terminal informational/success is transient; actionable errors persist.

4. **[P1 · Defect · high] Assistant status is an unstyled, inaccessible lifecycle exception.**
   - Axis: design-system coherence, accessibility, focus.
   - Evidence: `UtilityNodes.tsx:594–602`, `AppNext.tsx:5291–5309`; no `.assistant-status` styling found in `styles-next.css`; no live-region/busy semantics are present.
   - User impact: Assistant running/success/error cannot be trusted to match other node geometry, announcement, lifetime, or focus behavior.
   - Direction: map Assistant to C-02/C-03/C-04, reuse shared geometry, add scoped busy and atomic announcement behavior, keep focus stable, and collapse transient completion.

5. **[P2 · Defect · high] Generic node status uses unjustified vertical padding variants.**
   - Axis: vertical rhythm, sibling geometry.
   - Evidence: `styles-next.css:685–686` uses 8px vertical padding generally and 6px for canvas generators, while Storyboard's approved comparable text uses a 28px centered row with zero vertical padding.
   - User impact: similar 8px text occupies visibly different row heights and baselines across nodes.
   - Direction: use one shared 28px one-line minimum and horizontal-only inset; allow content-driven wrapping rather than per-node compact scales.

6. **[P2 · Defect · high] Global transient information reuses error-only visual/ARIA semantics.**
   - Axis: semantic color, announcement priority.
   - Evidence: `connectionNotice` auto-dismisses after 5200ms but always renders `.connection-error-toast` with `role="alert"` at `AppNext.tsx:5725`; informational edge reconciliation and cancellation share the same red error surface.
   - User impact: routine graph feedback is announced and painted as an error, weakening real failure salience.
   - Direction: split C-01 informational/success from global actionable errors while preserving placement, explicit close, 5200ms lifetime, and wrapper collapse.

# Accepted current rules

- Prism's flat dark regional palette, restrained purple accent, shared 28px node-control height, 8px compact node-control text, and regular 400 status/body weight remain governing.
- Similar-sized row text aligns to the `4 / 4s` and `Save` control-height center; semantic role may change color or border but not invent vertical density.
- Running exists only while running.
- Actionable errors persist while unresolved.
- Readiness and warnings may persist while true, but are separate from action notifications.
- Storyboard duration guidance is a persistent helper, not a notification.
- Storyboard's bounded ellipsis and reduced-motion fixed ellipsis are approved for running progress, pending rendered verification.
- Generator result media plus Rerun remains sufficient completion feedback; no passive completion/model banner is allowed.
- A transient wrapper must fully unmount/collapse after dismissal.

# Bounded Developer contract for system-wide propagation

## Objective

Replace the legacy mixed `progress/error/status` category with the six approved semantic contracts above, then propagate only those approved rules across every active next-generation node without redesigning Prism or changing node behavior.

## Protected behavior

- Preserve all node content, actions, provider calls, generation behavior, result media, Rerun/Stop semantics, Storyboard helper logic, error copy unless explicitly contracted, readiness truth, and the established Prism visual identity.
- Preserve Storyboard grid → duration helper → footer → lifecycle status order while the lifecycle row exists.
- Preserve current 315px fixed node width and adaptive generator exceptions.
- Do not add a modal, second status band, persistent success banner, new green semantic token, notification dot, or focus jump.

## Exact affected active files

Required active implementation targets:

1. `work/src/renderer/src/AppNext.tsx` — shared lifecycle state/timers, Storyboard/Assistant/generic completion expiry, global transient semantic split.
2. `work/src/renderer/src/UtilityNodes.tsx` — Storyboard and Assistant wrappers, busy/live/focus contract.
3. `work/src/renderer/src/styles-next.css` — shared row geometry, semantic variants, global transient variants, reduced motion, wrapper boundaries.
4. `work/src/renderer/src/productSurface.test.ts` — source-contract guards only where behavioral/DOM coverage is unavailable.
5. `work/src/renderer/src/NodeCardNext.tsx` — active generic node-status owner proved by `AppNext.tsx`; Developer must confirm and include it in the frozen snapshot before editing.

`work/src/renderer/src/NodeCard.tsx` is not an approved active edit target at this snapshot unless Developer first proves the active import has changed. Do not edit both NodeCard files to mask the boundary discrepancy.

## Implementation rules

1. Introduce one explicit semantic state mapping: running, transient terminal information/success, persistent actionable error, persistent readiness/warning, or persistent helper. Do not infer lifetime from a class name or from `progress` versus `error` alone.
2. Running wrappers exist only for queued/running state and collapse immediately on terminal transition.
3. Terminal information/success auto-dismisses after 5200ms, is superseded by new running/error state, and unmounts the entire wrapper.
4. Actionable errors persist until correction/retry/reset/dismissal; they do not inherit transient expiry.
5. Readiness and helper state remain condition-driven, not timer-driven.
6. Shared node row geometry: 8px/400/1.25, one-line minimum 28px, horizontal-only 8px/equivalent inset, flex-centered; two lines expand naturally.
7. `Storyboard revamped.`, `Storyboard unchanged.`, and `Storyboard already complete.` use C-03 and never permanent green.
8. Assistant running/success/error uses the same C-02/C-03/C-04 contract and retains one mounted initiating control with stable focus.
9. Global transient information uses polite atomic semantics and neutral/purple styling; global actionable error may retain alert semantics and red treatment.
10. No timer may survive unmount, overwrite a newer state, dismiss an actionable error, or leave an empty wrapper.

## Automated acceptance before rendered review

Behavioral/DOM tests are required where feasible; source-string tests alone are supporting evidence, not visual or interaction proof.

- Category table tests cover every active next-generation node kind that can emit progress/error/readiness/helper state and prove one assigned subcategory.
- Fake-timer tests prove C-03 remains visible before 5200ms, disappears at/after 5200ms, and the wrapper is absent afterward.
- Race tests prove an old completion timer cannot clear a newer running state or actionable error.
- Running tests prove wrapper existence only for queued/running, scoped `aria-busy`, one polite atomic announcement, and no terminal spinner/ellipsis.
- Error tests prove persistence beyond 5200ms, semantic non-color cue, and clearing only on correction/retry/reset/explicit dismissal.
- Storyboard tests cover running, changed, unchanged, already-complete, preflight, and connection failure; terminal success wrapper collapses while helper may remain independently.
- Assistant tests cover running → transient success → collapsed, running → persistent error, duplicate activation prevention, and initiating-control focus stability.
- Generic NodeCard tests cover generator, Character, Prompt Enhance, reusable semantic node, Upload/media, and any other active status-emitting kind.
- Global notice tests distinguish informational polite status from actionable alert while preserving 5200ms auto-dismiss only for the transient class.
- Geometry contract guards prohibit per-node vertical padding/min-height overrides for comparable 8px status rows.
- Reduced-motion tests retain a stable final ellipsis/indicator without layout shift.

## Rendered acceptance gate

Use a frozen Developer snapshot and deterministic fixtures; no live paid provider request is needed.

At the canonical node width, default canvas zoom, one representative zoom, and 440px app width, inspect:

- generic node: idle, queued/running, transient completion before expiry, post-expiry collapsed, actionable error, wrapped longest error;
- Storyboard: helper only; running only; helper + running; helper + transient success; post-success helper retained/status collapsed; error; no helper/no status;
- Assistant: ready, running, transient success, post-expiry collapse, persistent error, blocked readiness;
- header readiness: required, ready/connected, editor Cancel;
- global top notice: informational transient, actionable error, manual close, post-expiry collapse;
- reduced motion;
- keyboard focus before/during/after running and after transient dismissal;
- VoiceOver or equivalent announcement count for one running and one terminal/error transition.

Measure and record:

- one-line row outer height = 28px;
- text baseline/optical center against `4 / 4s` and `Save`;
- horizontal inset and divider alignment;
- longest legal two-line expansion without clipping;
- zero post-dismiss reserved height, border, padding, or dead band;
- no painted shift from spinner/ellipsis animation;
- no status row louder than the node footer or result media.

# Verdict

**CATEGORY CONTRACT APPROVED; SYSTEM-WIDE PROPAGATION BLOCKED PENDING ACTIVE NODECARD TARGET CONFIRMATION AND POST-IMPLEMENTATION RENDERED EVIDENCE.**

The category inventory and keep/repair/replace/split decisions are complete enough for Developer to implement without inventing notification semantics. The current UI is not accepted for propagation: Storyboard terminal success is visibly wrong, generic progress mixes incompatible lifecycles, Assistant is an unclassified exception, and the authorized `NodeCard.tsx` does not match the active `NodeCardNext.tsx` import. Final visual approval requires the bounded rendered acceptance gate above.

## Developer handoff

- Apply: findings 1–6 and contracts C-01 through C-06.
- Preserve: accepted current rules and protected behavior above.
- First blocker to resolve: confirm `NodeCardNext.tsx` as the sole active NodeCard implementation target in the frozen snapshot; do not edit both siblings speculatively.
- Re-review target: only the five exact active files listed above plus deterministic rendered states for global notice, generic node-status, Storyboard, Assistant, readiness, and helper categories.

# Post-code stable snapshot audit

## Stable snapshot and hash gate

- Manifest: `/tmp/prism-all-fixes-notification-prebuild.json`.
- Snapshot identity: `Prism all fixes — notification category pre-build`.
- Canonical root: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism`.
- Gate result: **PASS**. Before any listed implementation file was inspected, all ten manifest-listed files matched both the declared byte count and SHA-256 exactly:
  - `docs/CHANGE-IMPACT-NODE-NOTIFICATION-CATEGORIES-2026-08-23.md` — 1,350 bytes — `317bd3cea9812d96f980dc92ed7dfe96b0ae75ac77d90da1dfc5b209a12c22f1`
  - `skills/prism-foundry-product-standard/SKILL.md` — 33,854 bytes — `4176e4401396eac86448ea907e722680f7e626f886cf475661e2937d92aa8ef9`
  - `work/src/shared/nodeNotificationCategory.ts` — 1,833 bytes — `464f97cc21009afaefd02b6bee781e16915421e6d3280b2ef4d21ab790d5c61f`
  - `work/src/shared/nodeNotificationCategory.test.ts` — 3,087 bytes — `58f781dbb61470c61a76256d3f617f4ef97f82196e20a65d180531a4bbf1990e`
  - `work/src/renderer/src/AppNext.tsx` — 502,629 bytes — `2eb2b15e963c412c366c380513ad44f27184507319af635483e5fdb958181b2c`
  - `work/src/renderer/src/NodeCardNext.tsx` — 165,806 bytes — `9c052c2069605971c307f6651f443502fdfd249fb6b68d7dfabcb3fb7add2cc0`
  - `work/src/renderer/src/UtilityNodes.tsx` — 54,164 bytes — `2b336d4371d19accb42963e719c87fc306c3f6b235de0a1bee6f5512fea7a073`
  - `work/src/renderer/src/styles-next.css` — 234,714 bytes — `88ff68677a72b07555bcd8cb58d0c27664f75b0f44e2a3cee7ec6c7da2635e57`
  - `work/src/renderer/src/nodeNotification.contract.test.ts` — 3,604 bytes — `c87a70dfda02af5b2bf66114a02b2a8014e2ac2c11cc964b01183ea2b2bb47fa`
  - `work/src/renderer/src/productSurface.test.ts` — 157,922 bytes — `0c6c99f8b8720844cc058775154ee341f627002d03bad41bd3ab83d4f356fc77`
- Active boundary confirmed: `AppNext.tsx:116` imports `./NodeCardNext`; the manifest and active contract test name `NodeCardNext.tsx`. Inactive `NodeCard.tsx`, legacy `App.tsx`, and legacy `styles.css` were not inspected or edited.
- Inspection scope stayed limited to manifest-listed changed files, this existing category report, and the directly necessary approved Prism node-control tokens already present in `styles-next.css` (`--font-node-control: 8px` at line 17 and `--node-control-height: 28px` at line 31). No build, package, provider, live UI, source, test, canonical-document, skill, profile, or Obsidian operation was performed.

## Findings

1. **[P1 · Defect · high] An older timer can clear a newer same-copy terminal confirmation.**
   - Axis: C-03 lifecycle and timer-race safety.
   - Evidence: `nodeNotificationCategory.ts:39–41` treats an existing timer with the same `progress` string as the same event and returns without cancelling/restarting it. Its callback clears solely by node ID plus exact string at lines 42–47. The central owner in `AppNext.tsx:858–869` supplies no event/version identity beyond that string. Re-emitting a confirmation such as `Prompt enhanced`, copied/imported/connected feedback, or another identical terminal message before the old 5200ms deadline therefore leaves the old deadline armed against the newer event.
   - Contract impact: fails the explicit requirement that timer races cannot clear newer progress and fails C-03's full 5200ms transient lifetime for each new terminal event. The present fake-timer test covers different superseding progress, running, error, and cleanup (`nodeNotificationCategory.test.ts:37–57`), but not same-copy re-emission.
   - Direction: Developer must give each terminal emission a monotonic event identity or always restart the node timer on a newly committed terminal event, while preserving the exact-state guard against running and actionable error. Add a fake-timer case that re-emits identical copy and proves the newer event remains for its own full 5200ms.

2. **[P1 · Defect · high] Actionable preflight errors can retain and later resurrect an older terminal confirmation.**
   - Axis: C-03/C-04 supersession and state truth.
   - Evidence: `AppNext.tsx:3332` raises the Storyboard actionable preflight error with only `{ error: ... }`; `AppNext.tsx:5344` does the same for Assistant model/provider failure. `updateNode` is a plain data merge (`AppNext.tsx:1748–1751, 1777–1785`), so an older `progress` value remains. The lifecycle effect cancels the terminal timer whenever the category becomes error (`AppNext.tsx:853–856`). When a later edit or selector change clears only `error`, the retained old progress is eligible as C-03 again and can remount as stale success.
   - Contract impact: fails C-03's rule that a new error supersedes terminal information immediately and that an expired/superseded wrapper stays absent; it also weakens C-04 state truth by allowing an older success to outlive the error transition internally.
   - Direction: every C-04 transition from a lifecycle-capable node must clear superseded terminal progress and set an explicit error state consistently, without timing out the actionable error. Add Storyboard and Assistant regression cases for success → preflight error → correction, proving the stale success never remounts.

## Accepted source criteria

- **C-01 accepted by source contract:** global transient information and persistent actionable global errors are separate state owners and wrappers. `connectionNotice` alone receives a 5200ms cleanup (`AppNext.tsx:837–841`); `connectionErrorNotice` has no auto-dismiss timer. The rendered wrappers use polite atomic `role="status"` versus persistent `role="alert"` (`AppNext.tsx:5770–5771`) and neutral/purple versus rose error surfaces with matched global geometry (`styles-next.css:693–700`).
- **C-02 accepted by source contract:** generic NodeCardNext, Storyboard, and Assistant derive busy only from queued/running (`NodeCardNext.tsx:984, 1335`; `UtilityNodes.tsx:428–430, 493, 597–600`). Their running rows are polite atomic status regions and owning articles expose scoped `aria-busy` (`NodeCardNext.tsx:1566–1570`; `UtilityNodes.tsx:562, 600, 608`). Shared geometry is 28px minimum, horizontal-only 8px inset, centered 8px/400/1.25, with restrained purple/neutral running treatment (`styles-next.css:17, 31, 685–689`).
- **C-03 structural mapping accepted, subject to findings 1–2:** terminal progress maps to `transient`; generic active NodeCardNext, Storyboard, and Assistant conditionally mount only when a visible lifecycle value exists (`NodeCardNext.tsx:1094–1097, 1566–1571`; `UtilityNodes.tsx:429–430, 562–563, 598–608`). The shared timer unsets `progress`, so the wrappers can be fully absent. Storyboard's three terminal copies and Assistant's `Prompt enhanced` use this path (`AppNext.tsx:3333–3335, 3367–3369, 5346–5353`). No Storyboard status green remains; transient styling is shared purple/neutral (`styles-next.css:688, 1802–1806`).
- **C-04 accepted by source contract, subject to finding 2:** errors outrank running/transient in the classifier (`nodeNotificationCategory.ts:14–20`), use persistent alert semantics, and share the lifecycle-row geometry. The `is-error` variant adds a distinct left rule plus rose surface/text, providing a source-level non-color shape cue as well as alert semantics (`styles-next.css:689`; NodeCardNext/Storyboard/Assistant wrappers cited above). Rendered salience remains unverified.
- **C-05 accepted by source contract:** readiness remains condition-driven and separate from lifecycle rows. NodeCardNext retains header `Ready`/`Required`/`Cancel` pills (`NodeCardNext.tsx:1358–1359`); Assistant blocked account state remains condition-derived and disables the action (`UtilityNodes.tsx:595–607`). No notification timer owns these states.
- **C-06 accepted by source contract:** Storyboard duration guidance remains conditionally mounted above the footer and separate from the lifecycle status (`UtilityNodes.tsx:555–562`). It retains the shared content-driven 28px feedback geometry while its own CSS adds only helper surface/color semantics (`styles-next.css:685–686, 1788–1789`).
- **Category propagation accepted by source contract:** generic active NodeCardNext, Storyboard, Assistant, and the global top notices map to the approved semantic categories. The active source-contract test explicitly reads `NodeCardNext.tsx` and covers those mappings (`nodeNotification.contract.test.ts:4–58`).
- **No forbidden per-instance geometry overrides found:** `.node-status`, `.assistant-status`, `.storyboard-status`, and `.storyboard-duration-helper` add only placement, radius, border, surface, or color rules; they do not redefine status padding, min-height, font size, weight, or line height (`styles-next.css:685–692, 1788–1806, 1863`; `nodeNotification.contract.test.ts:50–58`; `productSurface.test.ts:899–909`).
- **Protected contracts remain present by source evidence:**
  - phone/prompt-tag routing: graph-truth tag connection, alias exposure, and ambiguity rejection remain asserted in the manifest-listed product-surface contract (`productSurface.test.ts:425–444`); the manifest records the focused `promptTags.test.ts` gate within the passing 61/61 run;
  - selector fallback: saved missing menu values still derive a public `modelDisplayName` and provider icon rather than exposing an internal route (`productSurface.test.ts:1380–1384`);
  - native scroll: Storyboard keeps its native overflow scroller, stops only Canvas propagation, and does not synthesize `scrollTop` or prevent default (`UtilityNodes.tsx:514`; `productSurface.test.ts:912–918`);
  - caret/native text history: `AppNext.tsx:129, 1633–1660` still routes text-entry history to the native control and prevents Canvas undo/redo takeover; the manifest records passing focused text-editor and Storyboard text-history tests;
  - Canvas-history sanitizer: `sanitizeCanvasHistoryNodes` remains imported and applied to dirty snapshots, undo, redo, and restored pages (`AppNext.tsx:130, 233–236, 1206, 1585–1617`); the manifest records the focused sanitizer gate as passing;
  - Revamp All: one in-flight guard, one batch request/parse/apply path, and one atomic state commit remain (`AppNext.tsx:3324–3375`; `productSurface.test.ts:860–875`).
- Manifest-declared verification was read as evidence, not rerun: focused affected tests `11/11` files and `61/61` tests passed; product-surface `1/1` file and `142/142` tests passed; typecheck passed. Build/package/open remain correctly unrun at this pre-build boundary.

## Remaining deterministic rendered fixtures

Rendered approval is still outstanding after Developer resolves findings 1–2 and returns a new hash-frozen pre-build snapshot. The build candidate must then exercise, without a paid provider call:

- generic active NodeCardNext: idle; queued/running; transient completion before expiry; identical-copy re-emission; post-expiry zero wrapper; actionable error; success → error → correction with no stale success; longest wrapped error;
- Storyboard: helper only; running only; helper + running; helper + transient changed/unchanged/already-complete; helper retained after status collapse; preflight and connection errors; success → preflight error → correction; no-helper/no-status;
- Assistant: ready; running; transient success; identical `Prompt enhanced` re-emission; post-expiry collapse; persistent provider/model error; success → provider/model error → correction; blocked readiness;
- global top notice: informational transient, persistent actionable error, manual close, and post-expiry collapse;
- header required, ready/connected, and editor Cancel; reduced motion; keyboard focus before/during/after running and dismissal; one running plus terminal/error announcement-count check;
- canonical 315px node width at default and representative Canvas zoom, plus 440px application width: 28px one-line rows, natural two-line expansion, centered baseline, aligned inset/divider, zero post-dismiss border/padding/dead band, and no ellipsis/spinner layout shift.

## Verdict

**BLOCKED**

The hash gate and most C-01–C-06 source contracts pass, and the active `NodeCardNext.tsx` boundary is now correct. Build authorization remains blocked because an older timer can clear a newer identical terminal event, and Storyboard/Assistant preflight errors can retain then resurrect stale terminal progress. Developer must fix only those lifecycle paths, add the bounded deterministic timer/state regressions, produce a new manifest with verified hashes, and return the same bounded files for re-review. Visual approval remains separately pending the deterministic rendered fixtures above.

# Final blocker resolution

## Frozen manifest and hash gate

- Manifest: `/tmp/prism-all-fixes-prebuild-v2.json`.
- Snapshot: `Prism all fixes pre-build v2 — notification blockers and sequence mention planning`.
- Gate: **PASS**. Before source inspection, every one of the 15 manifest entries matched both declared byte count and SHA-256:
  - `docs/CHANGE-IMPACT-NODE-NOTIFICATION-CATEGORIES-2026-08-23.md` — 1,350 bytes — `317bd3cea9812d96f980dc92ed7dfe96b0ae75ac77d90da1dfc5b209a12c22f1`
  - `docs/CHANGE-IMPACT-NOTIFICATION-BLOCKERS-SEQUENCE-MENTIONS-2026-08-23.md` — 1,334 bytes — `f6960a2eb9e23c378c954f12c1e078c4e8ffce44c36ae115f3ea183c6e9a43dd`
  - `docs/features/nodes/workflow/storyboard/storyboard-node.md` — 13,337 bytes — `c0e4e85fe3b4aa84916ce14637997818624759ca3b855973ae614a181bee5d0a`
  - `skills/prism-foundry-product-standard/SKILL.md` — 34,386 bytes — `6aa0876a74d97087509fc6276b654d4d8380851a789bf58f330620be46d6b7ae`
  - `work/src/shared/types.ts` — 23,807 bytes — `67f9e044a656e2cfca270900dca41ae8fc88464bece6b21f52df10fe5060a163`
  - `work/src/shared/nodeNotificationCategory.ts` — 2,621 bytes — `545a02cd39cb3653745d6f553f14bcc189781fa1a24d72070a0a273a2b9eaf5e`
  - `work/src/shared/nodeNotificationCategory.test.ts` — 4,853 bytes — `75300cfc1d7d340227e39271cd2f5ffa25880d5c14a4b18646d987c9e40a2a30`
  - `work/src/shared/storyboardRewrite.ts` — 28,526 bytes — `38ab05c006a7c1efcc2640103190c160bc922d270f7014940b7b74c5c185988d`
  - `work/src/shared/storyboardRewrite.test.ts` — 31,804 bytes — `0120492f9ab1ca6c3509f3e014f0a5381f3a702e9134c97f9887463d0907d7d0`
  - `work/src/renderer/src/AppNext.tsx` — 502,979 bytes — `f8f5664d57761b7303f02b3bf9e511d8916c14c5f1c2acf88481016caf7bd3fb`
  - `work/src/renderer/src/NodeCardNext.tsx` — 165,806 bytes — `9c052c2069605971c307f6651f443502fdfd249fb6b68d7dfabcb3fb7add2cc0`
  - `work/src/renderer/src/UtilityNodes.tsx` — 54,164 bytes — `2b336d4371d19accb42963e719c87fc306c3f6b235de0a1bee6f5512fea7a073`
  - `work/src/renderer/src/styles-next.css` — 234,714 bytes — `88ff68677a72b07555bcd8cb58d0c27664f75b0f44e2a3cee7ec6c7da2635e57`
  - `work/src/renderer/src/nodeNotification.contract.test.ts` — 3,604 bytes — `c87a70dfda02af5b2bf66114a02b2a8014e2ac2c11cc964b01183ea2b2bb47fa`
  - `work/src/renderer/src/productSurface.test.ts` — 157,922 bytes — `0c6c99f8b8720844cc058775154ee341f627002d03bad41bd3ab83d4f356fc77`

## Blocker resolution

- **N-01 resolved by source contract.** `notificationVersion` is part of node state (`types.ts:95–98`). Every newly committed terminal progress emission increments that monotonic identity in `nodeLifecycleTransition` (`nodeNotificationCategory.ts:23–31`). Expiry is keyed by node, exact copy, and version; a different version cancels the previous handle and starts a fresh 5200ms timer (`nodeNotificationCategory.ts:44–61`). Both the timer callback and App-level clear path reject a stale copy/version, running state, or error (`nodeNotificationCategory.ts:55–60`; `AppNext.tsx:858–870`). The fake-timer regression re-emits identical copy after 4000ms, proves the old deadline cannot clear it, and proves the new event receives the remaining full 5200ms (`nodeNotificationCategory.test.ts:38–54`).
- **N-02 resolved by source contract.** `nodeLifecycleTransition` clears `progress` whenever an actionable `error` is raised and normalizes a terminal/errorless run state to explicit `error`; clearing the error later does not restore progress (`nodeNotificationCategory.ts:23–32`; `nodeNotificationCategory.test.ts:56–63`). The transition is centralized through active `updateNode`, origin-graph patches, and Storyboard's atomic result commit (`AppNext.tsx:1082–1085, 1750–1791, 3361–3375`). Storyboard preflight/selection/catch paths and Assistant selection/catch paths therefore cannot retain or remount an older success (`AppNext.tsx:3334–3346, 3376–3377, 5340–5358`). Actionable error remains persistent because only `transient` state schedules expiry (`AppNext.tsx:849–878`).

## Category and boundary acceptance

- C-01 through C-06 remain intact. Global transient notice and persistent global error remain separate wrappers/lifecycles; generic NodeCardNext, Storyboard, and Assistant retain shared semantic category mapping and conditional wrappers; readiness and Storyboard helper remain condition-driven and timer-independent.
- The active boundary remains `AppNext.tsx` → `NodeCardNext.tsx`. `NodeCardNext.tsx`, `UtilityNodes.tsx`, `styles-next.css`, the active notification contract test, and the product-surface contract retain the exact hashes accepted in the preceding audit snapshot.
- Shared geometry remains `var(--node-control-height)` with `padding: 0 8px`, flex centering, `var(--font-node-control)`/400/1.25. No comparable status instance adds a vertical geometry override.
- Storyboard transient status remains restrained purple/neutral; no persistent green Storyboard status rule is present. Conditional rendering removes the lifecycle wrapper when no status exists, while the independent helper may remain.
- The additional Storyboard whole-sequence mention-policy work is outside the visual notification category. It changes rewrite context, validation, tests, and policy documentation only. It does not change notification wrapper anatomy, category mapping, geometry, color, timer ownership, persistence, or collapse behavior.

## Remaining rendered fixtures

Build approval is granted; final visual acceptance remains pending these deterministic, no-paid-provider fixtures:

- Generic active NodeCardNext: idle; queued/running; transient completion before expiry; identical-copy re-emission; post-expiry zero wrapper; actionable error; success → error → correction with no stale success; longest wrapped error.
- Storyboard: helper only; running only; helper + running; helper + transient changed/unchanged/already-complete; helper retained after status collapse; preflight and connection errors; success → preflight error → correction; no-helper/no-status.
- Assistant: ready; running; transient success; identical `Prompt enhanced` re-emission; post-expiry collapse; persistent provider/model error; success → provider/model error → correction; blocked readiness.
- Global top notice: informational transient; persistent actionable error; manual close; post-expiry collapse.
- Header readiness: required; ready/connected; editor Cancel.
- Reduced motion; keyboard focus before/during/after running and dismissal; one running plus terminal/error announcement-count check.
- Canonical 315px node width at default and representative Canvas zoom, plus 440px application width: 28px one-line rows; natural two-line expansion; centered baseline; aligned inset/divider; zero post-dismiss border, padding, or dead band; no ellipsis/spinner layout shift.

## Verdict

**APPROVED FOR BUILD**

The two source blockers are resolved in the frozen snapshot. This is build authorization, not final rendered visual approval; the rendered fixture gate above remains open.
