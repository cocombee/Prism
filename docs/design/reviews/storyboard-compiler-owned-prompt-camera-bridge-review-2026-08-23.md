# Storyboard Compiler-Owned Prompt and Camera-Bridge Plan Review — 2026-08-23

## Audit identity and stable read snapshot

- Role: Designer, non-competing read-only design authority.
- Review phase: pre-code contract review; Developer is the sole source/integration owner and sole writer of renderer source, tests, builds, packages, and canonical product documentation.
- Dependency graph: this frozen Designer contract → Developer implementation and deterministic tests → one hash-identified stable snapshot → bounded Designer rendered audit. No source mutation may begin from a moving design draft.
- Specialist routing: Designer Supervision + Iris / Design Inspector + Hallmark Audit. shadcn and Taste were not triggered: this is an existing non-shadcn Prism product surface with resolved visual direction.
- Protection: active Prism UI is protected legacy/unknown design evidence and remains read-only. This report is a separately reserved post-cutoff artifact.
- Active files inspected only: `work/src/renderer/src/AppNext.tsx`, `work/src/renderer/src/NodeCardNext.tsx`, and `work/src/renderer/src/styles-next.css`. Legacy `App.tsx`, `styles.css`, and inactive `NodeCard.tsx` were not inspected.
- No source, tests, canonical docs, skills, profiles, Obsidian content, build, package, UI, catalog, provider, or inference action was performed.

Frozen SHA-256 evidence:

- approved plan: `ace8b60b838339bcd1c73e1437ba83be33aaa91491c67592a0b35640acbbcef6`
- `AppNext.tsx`: `f8f5664d57761b7303f02b3bf9e511d8916c14c5f1c2acf88481016caf7bd3fb`
- `NodeCardNext.tsx`: `9c052c2069605971c307f6651f443502fdfd249fb6b68d7dfabcb3fb7add2cc0`
- `styles-next.css`: `88ff68677a72b07555bcd8cb58d0c27664f75b0f44e2a3cee7ec6c7da2635e57`
- notification category audit/report: `bd54c2bda9e507d912feee666b5ebc5a826d39288285a4167b1708e75141925e`
- visual and interaction standard: `9b815d5c7bc9e280734e8f5c72c95afd68e4f834daf34558f98de928693ad1c0`
- Prism product skill: `3708f75f64c36f56764c50fc1dd41133632b87db24cbc8b814b3e7f03edf23a3`

Rendered evidence consulted only as category context:

- `/Users/mrkokom/Library/Application Support/Hermes/composer-images/composer_2026-08-23_11-57-16-105_0113b1.png`
- `/Users/mrkokom/.hermes/cache/images/computer_use_e9466f74a73f4bce8c12ba221a562101.png`

Those images show the Storyboard helper/footer and an obsolete permanent green `Storyboard revamped.` row. They do not show the Video Generator prompt, compiler ownership, blank/bridge conflict, disconnect restoration, focus, copying, constrained width, or current post-audit notification implementation. They support only the established compact hierarchy and the prior category defect; they cannot grant visual approval for this task.

## Design read

- Audience: a Prism user authoring an executable Storyboard and generating video from that authored sequence.
- Primary job: understand that the connected Storyboard—not the Video Generator textarea—is the editable source of action, timing, framing, camera, and Cut/Continue structure, while still being able to inspect and copy the exact compiled provider prompt.
- Product tone: flat, dark, compact, deterministic, and restrained. Compiler ownership is state truth, not a new feature banner.
- Protected behavior: the existing Video Generator prompt region, node order, model/delivery controls, Run/Stop/Rerun behavior, graph navigation, notification contracts, native text selection/history behavior, node geometry, and Prism palette remain intact unless this contract explicitly changes one state.
- Design objective: change ownership and interaction semantics without redesigning the node, adding a selector/modal, creating a second prompt surface, or introducing persistent success chrome.

## Existing system evidence

1. The active renderer imports `NodeCard` from `./NodeCardNext` (`AppNext.tsx:116`).
2. The active Video Generator uses the existing `TaggedPromptTextarea` in the same prompt slot (`NodeCardNext.tsx:1495–1515`).
3. Existing prompt geometry is governed by `styles-next.css:281–315`:
   - same full-width prompt slot;
   - `48px` minimum and `120px` maximum textarea/highlight height;
   - `11px 13px` padding;
   - `9px` regular text at `1.45` line-height;
   - input-region background `#0f0e12`, prompt text `#f0edf3`, top divider `#29262f`;
   - vertical resize and native overflow scrolling.
4. `TaggedPromptTextarea.tsx:143–168` keeps a real textarea above a pointer-transparent highlight layer. It currently owns editable change propagation, caret/selection restoration, autocomplete suggestions, native text-history shortcut containment, focus state, and scroll synchronization. Merely styling the wrapper cannot produce a truthful read-only state.
5. The nearest existing read-only visual analogue is a state change without disabled dimming: the preset asset tag uses a dedicated `is-readonly` treatment (`NodeCardNext.tsx:1349–1351`, `styles-next.css:253`). Its exact tag geometry is not transferable to the prompt; its transferable rule is that read-only content remains legible and stateful rather than disabled.
6. The approved notification audit defines C-04 persistent actionable error: `8px`/400/1.25, `28px` one-line minimum, `0 8px` inset, natural wrapping, restrained rose surface/text with a non-color cue, stable placement near resolving controls, alert semantics once, and persistence until corrected/retried/reset. Current source maps active node lifecycle rows through `nodeNotificationCategory` (`NodeCardNext.tsx:1094–1097, 1566–1571`; `styles-next.css:685–689`).
7. Existing code contains targeted `fitView({ nodes: ... })` behavior for creation flows, but no inspected, established user-facing action that navigates from a connected Video Generator to its Storyboard. A private capability is not an approved navigation affordance.
8. The visual standard protects adaptive Video Generator geometry while requiring constrained robustness, a `440px` application-width shell, stable Canvas zoom behavior, and no layout resets from unrelated rerenders.

# Existing category audit

## Category A — Compiler-owned prompt surface

- Scope: the existing Video Generator prompt textarea only while a live `storyboard-in` edge owns it.
- Included: connected valid compile, live recompilation, focus/selection/copy, ownership description, disconnect transition.
- Excluded: manual disconnected prompt, Storyboard panel editors, Composed Provider Prompt inspection, submitted in-flight request snapshot, provider output, generic disabled controls.
- Provenance: new state in a protected existing component; no previously approved compiler-owned textarea category exists.
- Nearest approved analogues: the existing prompt geometry and native textarea interaction; the preset asset tag's legible non-disabled read-only semantics. Neither authorizes new geometry.

Inherited-rule decisions:

- **Keep:** the exact prompt slot, typography, padding, divider, input-region material, min/max height, native scrolling, selection paint, text cursor, connected-tag highlighting, and surrounding node order.
- **Repair:** ownership semantics. The textarea becomes genuinely `readOnly` and exposes owner/edit-route help without dimming or pretending to be disabled.
- **Replace:** editable `onChange` behavior, tag-completion mutation, suggestion popup, and any insertion/deletion path while compiler-owned. Copy and selection remain.
- **Split:** manual and compiler-owned are two interaction states of one prompt component, not two textareas and not two persisted sources of truth.

Approved shared anatomy and behavior:

- Geometry/material/color/type remain byte-for-byte visually equivalent unless rendered evidence proves the native read-only state needs a minimal state cue. No pre-authorized new CSS row, badge, icon, tint, border, or label exists.
- Compiler-owned text remains full-strength `#f0edf3`; do not apply disabled opacity, disabled cursor, or disabled control colors.
- The real textarea stays mounted and focusable. It may hold a collapsed caret/selection anchor for keyboard selection, but typing, paste, cut, delete, drop, autocomplete completion, and IME composition cannot mutate the value.
- Mouse drag, Shift+Arrow, Cmd+A, Cmd+C, context-menu Copy, and native scrolling remain available. Cmd+X must not remove text. The highlight layer remains pointer-transparent and synchronized.
- `readOnly`, not `disabled`, is required. Set native read-only semantics and `aria-readonly="true"`; do not redundantly disable or remove the field from tab order.
- Suppress tag suggestions while read-only. Connected `@tags` may remain visually highlighted because they are compiled content, but the compiler-owned field must not offer an editing affordance it cannot complete.

## Category B — Compiler ownership attribution and edit route

- Scope: explanation of who owns the prompt and where editing occurs.
- Provenance: derived from explicit user command and Category A; no new visual category is needed.
- **Keep:** existing graph connection/wire and normal Canvas selection/navigation.
- **Replace:** any implication that the prompt itself is editable while connected.
- **Do not introduce:** selector, modal, link row, badge, persistent helper band, new icon, or `Compiled from Storyboard` chrome.

Decision: visible `Compiled from Storyboard` text is **not required in the first implementation**. It would create a new persistent row and alter node rhythm without an approved navigation action. Accessible/help text is sufficient when combined with native read-only behavior and the existing visible graph connection:

- accessible name identifies this as the Video Generator compiled prompt;
- `aria-describedby` provides: `Compiled from connected Storyboard. Edit panels, timing, framing, camera, and transitions in Storyboard.`;
- the same concise ownership/edit-route help may be exposed through the existing native `title`/help mechanism on the prompt surface, without reserved layout height;
- do not render a clickable edit-through-Storyboard action until Developer can point to an already shipped, equivalent graph-navigation action. The inspected targeted `fitView` implementation is not itself user-facing precedent.

If an established navigation affordance is later proved in the frozen snapshot, it may select/focus the already connected Storyboard using that exact pattern; it must not create a modal or change Canvas zoom unexpectedly. Otherwise instructional help only is the approved first release.

## Category C — Blank/bridge readiness conflict

- Scope: blank panel, unknown/unsafe camera bridge, or impossible Continue timing that prevents compilation/Run.
- Provenance: approved C-04 persistent actionable error; this category is already audited and must not be re-invented.
- **Keep:** C-04 semantics, shared lifecycle row geometry, error placement, non-color cue, and persistent lifetime.
- **Repair:** ensure the compiler's exact actionable readiness message is the state supplied to the existing category and the Run disabled reason.
- **Replace:** invented blank action, silent fallback, transient expiry, generic success, or a new bridge-specific banner.
- **Split:** error state from compiler-owned valid prompt state. A conflict may leave the last valid compiled text inspectable only if it is clearly stale/non-runnable in state logic; it must never look like the current successful compilation. Preferred initial behavior is current attempted compile plus persistent C-04 error, with Run blocked.

Contract:

- Blank panel copy names the exact panel and tells the user to describe its action in Storyboard.
- Impossible bridge copy names the panel/boundary, source → target framing, duration, and all four remedies: increase duration; reduce framing delta; choose a compatible movement; or choose Cut.
- Use the one existing `node-lifecycle-row node-status is-error` slot near the controls. Do not add a second error band or move the error into the prompt.
- One-line state is exactly the approved `28px` minimum. Longest legal conflict expands naturally to two or more lines without clipping, fixed two-line dead height, or footer overlap.
- Error persists until the authoritative Storyboard/connection state is corrected, superseded by running, or explicitly reset through existing behavior. No 5200ms expiry.
- Use alert/assertive semantics only on the new transition, not on every live recompilation rerender. Focus remains where the user was working.
- No green success message, no compiler-complete banner, and no success color are permitted.

# Accepted UI and interaction contract

## 1. Ownership and display

1. A live `storyboard-in` edge atomically makes the existing Video Generator prompt compiler-owned.
2. Display the deterministic compiled prompt in the same `TaggedPromptTextarea`; do not add a second source, preview panel, selector, modal, or inspector requirement.
3. The rendered prompt value follows the current authoritative Storyboard and connected semantic authorities. A provider call is never required for display sync.
4. The submitted in-flight request retains its activation snapshot. Later Storyboard edits update only the live prompt/readiness for the next Run.
5. `Compiled from Storyboard` remains non-visible help in the first implementation as specified in Category B.

## 2. Geometry, typography, spacing, and color

1. Preserve the existing prompt box geometry exactly: full-width slot; `48px` minimum; `120px` maximum; `11px 13px` padding; `9px`/400/`1.45`; current resize/scroll behavior; current top divider and input-region material.
2. Do not add vertical margin, ownership row, badge, icon, left rail, persistent tint, disabled opacity, or semantic green.
3. Preserve connected-tag highlight color and selection paint. Read-only state must remain at normal readable contrast.
4. Preserve the existing stage → prompt → lifecycle/controls/footer order. A C-04 conflict uses the already approved lifecycle slot; it does not alter prompt height.
5. No field remount, wrapper-key change, or height animation is permitted solely because ownership/value/readiness changes.

## 3. Focus, caret, copy, and live recompile

1. The compiler-owned textarea remains keyboard focusable and selectable. `readOnly` and `aria-readonly="true"` are required; `disabled` is prohibited.
2. Pointer and keyboard selection, Cmd+A, Cmd+C, context-menu Copy, and scrolling must work. Cut, paste, typing, deletion, drop-to-insert, IME mutation, and tag completion must not change compiler-owned content.
3. Focus may not jump to Storyboard, Run, the node shell, or document body when the prompt recompiles, raises/clears an error, or disconnects.
4. Live recompilation keeps the same textarea DOM node. Preserve focus; clamp any selection to the new value; preserve a valid selected range when feasible; retain native scroll position unless the new content makes that offset impossible. Never force scroll-to-top or scroll-to-caret.
5. Recompilation must not open the connected-tag suggestions menu and must not invoke the editable `onValueChange` route.
6. The prompt remains resizable through the existing vertical resize affordance. A user-resized height must not reset on recompile or ownership transition.
7. No Canvas viewport, selected node, zoom, inspector, or autosave/history state changes from prompt display sync alone.

## 4. Edit-through-Storyboard route

1. Do not add new visible navigation chrome.
2. Provide the exact accessible/help description in Category B.
3. Preserve the existing graph edge as the sighted spatial relationship. Users navigate/select the Storyboard through existing Canvas behavior.
4. Add an explicit focus/select action only if Developer proves and reuses an existing equivalent user-facing graph-navigation affordance in the stable snapshot. Do not treat an internal `fitView` call as precedent, and do not auto-navigate on prompt focus, click, or error.

## 5. Run blocking and actionable conflict

1. Blank/impossible compilation atomically sets the existing actionable readiness/error state and disables Run before the user can submit stale content.
2. The disabled Run control retains its existing visible disabled treatment, accessible name, and focusable explanatory tooltip wrapper; the reason must be the same current compiler conflict, not generic `Requirements missing` copy when the specific remedy is available.
3. Error correction through Storyboard live recompilation clears the exact conflict and restores Run eligibility without success chrome, focus movement, or a transient green row.
4. A running request is not retroactively invalidated by edits; its immutable snapshot continues. The live node may show next-run readiness without mutating the in-flight payload or replacing Stop semantics.

## 6. Disconnect and manual restoration

1. Preserve the complete pre-connection manual prompt byte-for-byte in reversible state; never overwrite it with compiler output.
2. Disconnect atomically restores `manual` ownership, the preserved manual value, editable behavior, tag completion, and current manual readiness. There must be no frame showing compiler output in an editable field.
3. Keep the same textarea DOM node and geometry. Focus remains if it was inside the field; selection is clamped to the restored manual value without forced selection or focus.
4. Compiler conflict/error state clears when its authoritative Storyboard edge disappears. Any independent manual readiness error is recalculated separately; stale bridge/blank copy cannot survive disconnection.
5. Compiler text must not enter the manual native undo stack as a user edit. Disconnect must not silently adopt the compiler output when no prior manual string is available; the migration contract must define a truthful empty/manual fallback rather than guess.
6. Reconnect recompiles from current Storyboard state while preserving the latest manual prompt for the next disconnect.

## 7. Accessibility

- Real textarea semantics, accessible name, `readOnly`, and `aria-readonly` agree.
- The ownership/edit-route description is programmatically associated once; it is not a live region and must not re-announce on every compile.
- New C-04 errors announce once with existing alert semantics and a non-color cue. Unchanged error rerenders remain silent.
- Read-only content remains reachable by keyboard and copyable by assistive technology.
- Focus indicator, selection highlight, and prompt contrast remain the existing approved prompt behavior; measure rather than infer contrast in the rendered audit.
- No ownership meaning depends only on color, cursor shape, or the connected edge.
- Reduced motion has no new animation. Existing running indicators retain their approved reduced-motion behavior.

# Ranked plan findings

1. **[P1 · Risk · high] `readOnly` must be implemented through `TaggedPromptTextarea`, not only passed cosmetically at the call site.**
   - Axis: interaction truth, focus, accessibility.
   - Evidence: `TaggedPromptTextarea.tsx:27, 93–112, 143–167` still computes suggestions, propagates changes, restores selection, and can focus after completion. `NodeCardNext.tsx:1507–1514` currently supplies an unconditional edit callback.
   - Contract impact: a superficially read-only wrapper could still expose autocomplete/edit routes or disturb focus on compiler updates.
   - Direction: preserve one real textarea and its geometry, but gate all mutation/suggestion behavior on compiler ownership while retaining focus, selection, copy, native scroll, and resize. This is a Developer implementation requirement, not a request for a replacement component.

2. **[P1 · Risk · high] Run blocking, compiled value, and C-04 conflict must transition atomically from one compile result.**
   - Axis: state truth, error category, safe primary action.
   - Evidence: the plan distributes compilation, ownership, display cache, fingerprint, and readiness across Tasks 4–7; current renderer already has separate prompt/status/Run paths.
   - Contract impact: a split update could briefly expose stale compiled text with enabled Run, or clear a conflict before the authoritative prompt is valid.
   - Direction: one deterministic resolution result owns current compiled display, ownership, exact conflict, and Run eligibility for that fingerprint. Reuse C-04; no bridge-specific banner or transient expiry.

3. **[P1 · Risk · high] Manual restoration must be explicit before connection mutates display state.**
   - Axis: reversibility, content trust, focus.
   - Evidence: the plan calls restoration recommended at lines 393–399 and again an open decision at lines 657–660, while the user has now approved restoration as required behavior.
   - Contract impact: leaving this optional permits destructive loss or silent adoption of compiler output.
   - Direction: close the plan question: pre-connection manual prompt is preserved and restored atomically on disconnect, including reconnect cycles and migration/deleted-source cases. This is no longer an implementation preference.

4. **[P2 · Risk · high] The plan's “clearly attributed” acceptance is visually ambiguous and could invite unapproved chrome.**
   - Axis: hierarchy, category discipline, anti-churn.
   - Evidence: plan lines 628–630 require clear attribution; lines 464–470 specify accessible description but leave visible label/action unresolved; no inspected equivalent navigation action exists.
   - Contract impact: Developer could add a persistent ownership row, badge, or link, shifting node rhythm and creating a new category.
   - Direction: use the non-visible accessible/native help contract above. No visible `Compiled from Storyboard` label or edit link in the first implementation. Re-review any later proposed visible affordance separately.

5. **[P2 · Risk · high] Source-contract string checks are insufficient for copy/focus/selection and responsive acceptance.**
   - Axis: verification quality.
   - Evidence: plan lines 194–204 assert source strings; the rendered-evidence gate explicitly rejects source-only visual approval.
   - Contract impact: `readOnly={...}` can exist while the DOM remounts, autocomplete still opens, focus jumps, selection is lost, or the field clips at constrained width.
   - Direction: keep source checks only as boundary guards. Add behavioral DOM tests and complete the deterministic rendered matrix below before final design acceptance.

No P0 finding exists. The findings are resolved by this frozen contract and do not block Developer from beginning implementation.

# Automated acceptance before rendered review

Behavioral/DOM tests are required where feasible; source-string checks are supporting boundary evidence only.

## Ownership and value

- Disconnected Video Generator renders the existing editable prompt with manual value and no compiler ownership description.
- Connecting one live `storyboard-in` edge yields one existing textarea, same component identity, `readOnly === true`, `aria-readonly="true"`, associated ownership/edit-route help, and deterministic compiled value.
- Panel prose, duration, shot size, camera, Cut/Continue, mode, and connected semantic-authority changes each update the compiled value without provider/catalog calls.
- Unrelated selection, node movement, Canvas viewport, notification, save, and rerender changes do not change the compile fingerprint, displayed value, history, or autosave payload.
- In-flight submitted prompt remains byte-identical after later Storyboard edits; live display/readiness updates for the next Run.

## Interaction

- While compiler-owned: pointer selection, Shift+Arrow, Cmd+A, Cmd+C, context-menu Copy, scrolling, and vertical resize remain available.
- Typing, paste, cut, delete, drag/drop insertion, IME composition, and tag suggestion completion cannot mutate compiler-owned value.
- Tag suggestions never mount for the read-only prompt.
- Recompile while the textarea is focused preserves `document.activeElement`; selection is retained or safely clamped; no Canvas pan/zoom/selection change occurs.
- Recompile does not reset a user-resized prompt height or create any added wrapper height.
- Ownership help is announced/described once on focus and is not a live region.

## Error/category and Run

- Blank panel returns exact panel-specific actionable copy, mounts one C-04 row, disables Run, and never inserts fallback action prose.
- Impossible bridge returns the exact boundary/panel conflict and all four remedies, mounts one persistent C-04 row, and disables Run.
- Error remains beyond 5200ms; correction clears it and restores Run without mounting C-03 success.
- Repeated identical compiler error does not repeatedly announce; a meaningfully new conflict announces once.
- Long conflict wraps naturally; no fixed two-line height contract is introduced.
- Running request retains Stop semantics and immutable payload while next-run readiness changes.

## Disconnect/migration

- Connect preserves manual prompt; disconnect restores it byte-for-byte and restores editable behavior in one state transition.
- No intermediate render exposes compiler text as editable.
- Focus remains on the same textarea when applicable; selection clamps to restored manual value.
- Compiler conflict clears on disconnect; independent manual readiness recalculates.
- Reconnect/disconnect cycles restore the latest manual prompt, not the last compiled prompt.
- Legacy missing ownership fields infer compiler ownership only from a live edge; stale compiled text never claims ownership.
- Deleted/remapped/duplicated Storyboard source cases preserve reversible manual state and remap source identity without copying transient conflicts.

## Geometry/category guards

- Existing prompt selectors retain `48px` minimum, `120px` maximum, `11px 13px`, `9px`, `1.45`, current divider/material, and no compiler-only margin/row/badge/icon/tint.
- Existing C-04 geometry remains `28px` one-line minimum, `0 8px`, `8px`/400/1.25, content-driven expansion, and non-color error cue.
- No green success rule or compiler-complete text exists.
- No new selector, modal, visible ownership label, edit link, or alternate prompt surface exists.

# Rendered acceptance gate

Final visual approval requires a frozen Developer snapshot and deterministic fixtures with no paid provider call. Source approval is not rendered approval.

## Viewports and scale

Inspect every directly affected state at:

1. exact `315px` node width as the constrained canonical-node fixture;
2. the current default adaptive Video Generator width at default Canvas zoom;
3. one declared representative non-default Canvas zoom, recording the exact zoom value;
4. `440px` application width at default Canvas zoom, with the Video Generator and connected Storyboard reachable through existing Canvas behavior.

For each, record screenshots and measured geometry. Do not infer Canvas-scale correctness from CSS values alone.

## Required states

1. disconnected/manual: short prompt, longest practical prompt, focused caret, selection, resized height;
2. connected/valid: compiler-owned initial compile, focused selection, copy, scroll, connected-tag highlights, ownership help;
3. live update: panel prose, duration, framing, camera, and Continue → Cut changes while prompt is focused and while scrolled;
4. blank panel: persistent panel-specific C-04 error and Run blocked;
5. impossible bridge: shortest one-line case if available and longest four-remedy wrapped conflict;
6. corrected error: C-04 wrapper fully absent, Run restored, no success row or dead band;
7. disconnect: manual text/editability restored with no flash, focus jump, height reset, or stale error;
8. reconnect: compiler state restored while latest manual text remains recoverable;
9. running request plus later Storyboard edit: Stop/in-flight presentation stable, live next-run prompt/readiness truthful;
10. reduced motion and keyboard-only selection/copy/focus traversal;
11. VoiceOver or equivalent: ownership description once, new error once, unchanged recompile silent.

## Measurements and acceptance

- Prompt outer slot, content box, padding, type, line-height, top divider, min/max height, scrollbar, and resize handle match the disconnected baseline.
- No ownership-state layout shift; prompt, lifecycle slot, controls, and footer retain the same boundaries.
- Focus ring/caret/selection remain visible and readable; no disabled dimming.
- Read-only prompt accepts selection/copy but visibly refuses mutation without jarring focus loss.
- Live recompilation produces no focus jump, Canvas viewport change, node movement, wrapper remount flash, scroll-to-top, or prompt-height reset.
- One-line C-04 row is `28px`; longest conflict expands without clipping or footer collision; clearing leaves zero border/padding/dead height.
- At `315px`, representative zoom, and `440px` application width, no prompt text, error copy, Run control, scrollbar, resize handle, or ownership help is clipped or forced outside the node/shell.
- No new surface is louder than the prompt, footer, or active actionable error; no persistent green exists.

## Hallmark axis status at pre-code review

- Philosophy/specificity: **pass by contract** — Storyboard authority is product-specific and deterministic.
- Hierarchy/structure: **pass by contract** — same prompt region; no added chrome.
- Design-system coherence: **pass by contract** — existing prompt tokens and audited C-04 category govern.
- Interaction states: **source baseline inspected; implementation not tested**.
- Accessibility/contrast: **contract defined; semantic behavior and measured contrast not tested**.
- Responsive robustness: **contract defined; `315px`, representative zoom, and `440px` not rendered**.
- Content honesty: **pass by contract** — compiler cannot invent blank-panel action; errors state actual remedies.

# Verdict

**APPROVED FOR DEVELOPER**

Developer may begin implementation against this frozen contract. The approved plan's open design questions are closed as follows:

- preserve the exact existing prompt geometry;
- use `readOnly`, never `disabled`;
- keep selection/copy/focus/scroll/resize, suppress all mutation and autocomplete;
- use accessible/native help rather than visible `Compiled from Storyboard` chrome;
- add no edit link unless an existing user-facing graph-navigation affordance is proved and reused;
- use the already audited C-04 persistent actionable error and existing Run-blocking path;
- show no green or terminal success state;
- restore the pre-connection manual prompt atomically on disconnect;
- require deterministic behavioral tests and the complete rendered gate before final visual acceptance.

This verdict authorizes Developer source work; it is not final visual approval. Final verdict after implementation remains `SOURCE CONTRACT APPROVED; VISUAL UNVERIFIED` until the frozen rendered matrix passes.

## Developer handoff

- Apply: the accepted contract and ranked findings 1–5.
- Preserve: active next-generation boundary, one prompt surface, existing graph/navigation, prompt geometry, Prism palette/type hierarchy, current notification category contracts, in-flight request snapshot, and manual prompt reversibility.
- Do not touch: legacy `App.tsx`, legacy `styles.css`, inactive `NodeCard.tsx`, or unrelated visual categories.
- Stable snapshot return: exact commit/candidate or hash manifest; changed active files; focused behavioral test output; screenshots and measurements for the bounded rendered states.
- Re-review target: only the Video Generator prompt ownership states, its existing C-04 lifecycle slot/Run control, directly affected focus/copy/navigation behavior, and disconnect restoration at the four declared viewport/zoom conditions.

# Auto / Manual mode addendum

## Authority and supersession

- This addendum records the user's explicit two-mode decision and supersedes the report's Auto-only ownership assumptions where they conflict. It does not weaken the accepted prompt geometry, Auto `readOnly` behavior, C-04 actionable-error contract, copy/select/scroll/focus requirements, immutable running-request snapshot, no-green rule, or rendered-evidence gate.
- Developer remains the sole source/integration writer. Designer appends this report only.
- Active evidence used for this addendum: `NodeCardNext.tsx`, `UtilityNodes.tsx`, `AppNext.tsx`, and `styles-next.css` at the hashes already recorded in the session (`9c052c…`, `2b336d…`, `f8f566…`, and `88ff68…`). No rendered Auto/Manual implementation exists; visual acceptance remains open.

## Updated design read

The Video Generator prompt is one stable surface with two mutually exclusive ownership modes:

- **Auto:** the connected Storyboard compiler owns the live prompt; users inspect/copy it and edit upstream.
- **Manual:** the user owns a persistent draft in the same field; Storyboard prompt/timing/camera contribution is inactive, while applicable non-Storyboard connected authorities and provider/style layers may still compose around that draft.

The mode choice is compact state control, not a new section, selector, modal, label row, or second editor. Auto and Manual are two independent values behind one visible textarea. Switching changes which value and composition are active; it never converts one value into the other except for the one-time first Manual seed or the explicit Manual Reset action.

## Nearest-pattern category audit

### Included active analogues

1. **Storyboard Cut / Continue choice** — `UtilityNodes.tsx:537–540`; `styles-next.css:1742–1748`.
   - Two mutually exclusive choices use a compact capsule, `radiogroup`/`radio` semantics, a divider, a restrained inactive state, and a distinct purple selected state.
   - Decision: **keep** mutual-exclusion semantics, compact capsule anatomy, divider, and selected/inactive contrast; **repair** keyboard behavior where necessary; **replace** text labels with unambiguous icons plus tooltips for this prompt-local application.
2. **Character Multi / Sheets / Batch intake modes** — `NodeCardNext.tsx:1431–1435`; `styles-next.css:577–581`.
   - Icon-plus-label buttons use `aria-pressed` and a clear active surface.
   - Decision: **keep** the principle that each mode has its own recognizable icon and selected state; **replace** its three-column, 30px, label-bearing geometry because it is too large and would create a new prompt row.
3. **Connected-input Guide / Auto / Lock fidelity** — `NodeCardNext.tsx:544–550`; `styles-next.css:715–717`.
   - A compact segmented category exists, but it controls connection fidelity, not prompt ownership, and its legacy three-text-option form is not authority for this feature.
   - Decision: **split** from ownership modes. Do not reuse its labels, three-way logic, or `Auto` meaning.
4. **Magnetic Guides and other icon state controls** — active `AppNext.tsx` uses explicit pressed state and the shared viewport-level tooltip system.
   - Decision: **keep** action-specific custom tooltip, accessible state, and restrained inactive/bright selected distinction; do not copy application-header size or position.
5. **Storyboard inset Wand action** — `UtilityNodes.tsx:534–542`; `styles-next.css:1739–1751`.
   - A pointer-transparent prompt-action tray contains a pointer-active 28px circular action with an 11px icon, inset from the prompt edge.
   - Decision: **keep** inset action ownership, 28px circular geometry, 11px icon scale, neutral/purple hover, and disabled readability; **repair** right inset to preserve the Video prompt's native resize corner; **replace** WandSparkles with a truthful Reset icon and non-AI copy.
6. **Reset Node / Reset All** — `AppNext.tsx:5871–5876, 6258` uses `RotateCcw`, immediate execution, and no confirmation.
   - Decision: **keep** `RotateCcw`, no-confirmation behavior, and neutral reset semantics; **split** scope. Manual Reset changes only the Manual draft and composed preview, never all node settings.

### Approved ownership-mode category

- Category name: **Prompt ownership mode**.
- Scope: Video Generator prompt shell while a valid Storyboard connection makes Auto available.
- Category status: **derived and approved by this addendum**, not approved merely because legacy segmented controls exist.
- Shared anatomy: one compact two-icon capsule inside the existing prompt shell; one selected mode; one textarea; one optional Manual Reset action; no visible text label or extra row.
- Typography: none inside the icon controls. Tooltip text follows the shared application tooltip scale. Prompt text remains the existing `9px`/400/`1.45` contract.
- Material/color: inactive uses the prompt's restrained neutral control surface and icon color; selected uses the existing restrained purple selected treatment. No green, red, gradient, glow, or disabled opacity that makes an available mode unreadable.
- Motion: no animation beyond existing hover/focus state transitions; mode switching does not animate prompt height or cross-fade text.
- Propagation boundary: this Video Generator prompt only. Do not convert Storyboard transitions, fidelity controls, or reusable intake modes.
- Implementation owner: Developer only.

## Exact Auto / Manual control contract

### Placement and geometry

1. Keep the outer prompt slot, `48px` minimum, `120px` maximum, node order, divider, scroll behavior, and user-resized height unchanged.
2. Place one prompt-local ownership capsule at the **top-right inset** of the existing prompt shell. It overlays no external region and adds no row, margin, badge, heading, or persistent help band.
3. Capsule: `22px` outer height, compact pill radius, one border, one internal divider, two equal `22 × 22px` icon hit regions, and `11px` icons. Use the Storyboard transition capsule's compact density, not the 30px Character intake row.
4. Inset: `7px` from top and right, matching the established prompt-action optical inset. Reserve a right-side text corridor in both modes so prompt text, selection paint, scrollbar, and highlighted tags never sit beneath the capsule. The outer field geometry remains fixed; this addendum supersedes only the prior requirement that all four internal padding values remain untouched.
5. The textarea and highlight layer must receive identical effective content insets and wrapping width. The vertical scrollbar remains on the real textarea's outer right edge and must not be hidden by the capsule.
6. The capsule remains inside the prompt transform at Canvas zoom; tooltips remain viewport-level and unscaled/viewport-safe through the existing tooltip system.

### Icons, names, and selected state

- **Auto icon:** `Clapperboard`, `11px`, because Auto is specifically Storyboard compilation and must not imply paid AI. Do not use Sparkles or WandSparkles.
  - Accessible name: `Use Auto Storyboard Prompt`.
  - Tooltip: `Auto · Compiled from Storyboard`.
- **Manual icon:** `PencilLine`, `11px`.
  - Accessible name: `Use Manual Prompt`.
  - Tooltip before first seed: `Manual · Start from the current Auto prompt`.
  - Tooltip after seed: `Manual · Edit your saved draft`.
- Group accessible name: `Video prompt mode`.
- Use `role="radiogroup"` with two `role="radio"` buttons and truthful `aria-checked`, or an equivalent native single-select implementation. Do not combine radio semantics with contradictory `aria-pressed` state.
- Exactly one mode is selected. Selected state uses the approved restrained purple fill/inset outline and high-contrast icon; inactive remains neutral but fully legible. Hover cannot look identical to selected.
- Roving keyboard focus: one Tab stop enters the selected mode; Left/Right and Home/End change focus and selection; Space/Enter selects; Tab exits. Pointer selection leaves focus on the chosen mode button.
- Each icon requires the shared custom tooltip on pointer hover and keyboard focus. Native `title` alone is insufficient.
- When no live Storyboard is connected, Auto is unavailable. Keep Manual selected; Auto remains visible but disabled with a focusable tooltip wrapper explaining `Connect a Storyboard to use Auto`. Do not hide Auto and make the control jump.

## Exact mode-state behavior

### Auto

- Auto always displays the latest deterministic Storyboard compile and never freezes because the user visited Manual.
- The Auto value continues recompiling in the background from Storyboard panels, timing, framing, camera, transitions, and applicable connected authorities even while Manual is active.
- Auto textarea is the previously approved native `readOnly` state: focusable, copyable, selectable, scrollable, resizable, full contrast, no mutation/autocomplete, no focus or layout jump.
- Auto ownership/edit-path description remains associated programmatically and through tooltip/help; users edit upstream through existing Canvas navigation.
- Switching back to Auto shows the latest compile immediately, not the value that was visible when Auto was last left.

### Manual first seed and persistence

- The first deliberate transition into Manual for a node whose `manualPromptSeeded` marker is false performs one atomic seed: `manualPromptDraft = latest current valid Auto compiled prompt`, then `manualPromptSeeded = true`, then activates Manual.
- Seed exactly once. Later Auto changes never mutate Manual, and later Auto↔Manual switching never reseeds, reconciles, appends, or overwrites the Manual draft.
- First-seed disclosure must not create a row. While focus remains on the newly selected Manual button, its custom tooltip updates to `Manual · Draft copied once from the current Auto prompt`; a visually hidden polite one-time announcement may repeat that sentence. It is not a persistent live region and does not announce on later switches.
- If current Auto has no valid compiled value because of a blank/impossible bridge conflict, first Manual seed cannot fabricate content. Activate Manual with an empty draft, set the seeded marker once, and show Manual's own empty-draft readiness; do not copy stale last-valid Auto text without explicitly labeling it stale.
- In Manual, the existing textarea becomes editable with its approved caret, selection, native text history, tag completion, scroll, and resize behavior. Manual edits mutate only `manualPromptDraft`.
- Manual always resumes the existing draft byte-for-byte, including intentional emptiness.

### Switching and focus

- Keep one textarea DOM node and one prompt shell. Switching swaps controlled value, read-only state, help association, and active composition without remounting unrelated controls.
- A mode-button activation leaves focus on that mode button. It must not force focus into the textarea, Storyboard, Run, Canvas, or document body.
- If mode switching is triggered through a future keyboard command while the textarea is focused, preserve focus only when the resulting state remains usable; otherwise focus the selected mode button. Do not restore a stale caret from Auto into Manual or vice versa.
- Store independent selection/scroll snapshots per mode when feasible. At minimum, clamp selection safely and do not force scroll-to-top; switching back should restore each mode's prior valid scroll/selection rather than applying the other mode's coordinates.
- Mode switching never invokes a provider, never emits success chrome, never resets Manual, never freezes Auto, and never changes Canvas viewport or node size.

## Manual Reset contract

### Placement and anatomy

- Render Reset only in Manual mode.
- Use the Storyboard inset prompt-action/Wand anatomy: one circular `28 × 28px` action with an `11px` `RotateCcw` icon in a pointer-active tray inside the prompt shell.
- Place it at the **bottom-right inset while preserving the native textarea resize corner**. Reserve at least the native resizer's clear corner and shift the action left far enough that pointer access to the diagonal resize grip remains continuous at every tested zoom. Do not cover, disable, or replace the resize grip.
- Reserve the same right-side text corridor already used by the ownership capsule; Reset must not cover text, selection, highlighted tags, scrollbar, or the resize handle.
- Neutral inactive surface; restrained purple hover/focus. Reset is not destructive-red and never uses WandSparkles/Sparkles because it is deterministic and provider-free.

### Action, tooltip, and accessibility

- Accessible name: `Reset Manual Prompt to Auto`.
- Enabled tooltip: `Reset Manual to latest Auto prompt`.
- Disabled when Manual draft exactly equals the latest valid Auto compiled prompt; disabled tooltip: `Manual already matches latest Auto prompt`.
- Also disabled when no valid current Auto compile is available; tooltip: `Resolve the Storyboard prompt before resetting Manual` or `Connect a Storyboard to reset Manual`, whichever is true.
- The disabled action remains discoverable through the same focusable custom-tooltip wrapper pattern used for disabled Run explanations; a disabled button alone is not sufficient.
- On activation, explicitly replace only `manualPromptDraft` with the latest current valid Auto compiled prompt. Do not switch mode, change Auto, clear unrelated settings, invoke Revamp, invoke a provider, or alter Storyboard.
- Immediately recompute the active Manual Composed Provider Prompt from the replaced draft and all still-applicable non-Storyboard layers.
- Focus stays on Reset after activation. The textarea value updates in place; no node/Canvas focus jump and no success row.
- No confirmation dialog. This matches the existing immediate Reset Node / Reset All family, but this narrower reset must be **reversible as one history transaction**. Canvas Undo restores the previous Manual draft; if native textarea history owns the transaction, Cmd+Z while the textarea is focused must restore it once, not step through compiler internals. Reset marks the project dirty like an explicit user edit.

## Outgoing composition contract

- Composed Provider Prompt always shows the actual outgoing composition for the **currently active mode**, not a cached preview from the other mode.
- **Auto active:** compose from latest valid Storyboard compiler output plus applicable connected reference/style/provider layers. Storyboard blank/bridge conflicts block composition and Run through C-04.
- **Manual active:** compose from `manualPromptDraft` plus applicable connected Character, Wardrobe, Element, Location, Style, media/reference, direction, and provider adapter layers according to their existing contracts. Storyboard action/timing/camera/transition text contributes nothing merely because the edge remains connected.
- In Manual, the connected Storyboard edge may remain graphically present for quick return to Auto, but its prompt/timing/camera semantics are inactive and must not leak into provider-effective text, tags, duration planning, bridge errors, or request payload.
- Manual composition is empty/blocked only when the Manual draft is empty or an independent active non-Storyboard requirement fails. A Storyboard blank/bridge conflict alone cannot block Manual Run.
- Clearing Manual to empty raises one persistent actionable C-04 message such as `Write a Manual prompt before running.` It is Manual-specific, non-green, and clears when the draft becomes non-empty.
- Switching Auto → Manual suppresses Auto-only C-04 Storyboard conflict from the visible lifecycle slot and Run readiness; switching Manual → Auto restores the current Auto conflict immediately if still unresolved. Do not delete the background Auto conflict or announce it repeatedly while Manual is active.
- The Composed Provider Prompt preview updates in the same commit as mode selection, Manual typing, first seed, Reset, connected-authority change, or Auto recompile. No intermediate frame may show the inactive mode's outgoing composition under the newly selected mode.

## Immutable running-request behavior

- Run captures one immutable submitted snapshot containing active mode, active authored/compiled prompt, resolved outgoing composition, connected authority set, and compiler/bridge metadata only when Auto is active.
- Switching modes, editing Manual, recompiling Auto, or pressing Reset after activation changes only the next-run live preview/readiness. It never mutates the in-flight payload, Stop state, cost/time estimate, or result attribution.
- Rerun uses the currently active live mode and composition unless the established Rerun contract explicitly snapshots prior settings; Developer must make that choice truthful in tests and UI, not silently mix mode from one run with prompt from another.

## Persistence, migration, and connection behavior

Persist independently:

- `promptMode: 'auto' | 'manual'`;
- `manualPromptDraft`;
- `manualPromptSeeded`;
- only disposable Auto cache/fingerprint data if architecture requires it; Storyboard remains Auto authority.

Rules:

1. Save/duplicate/page-copy/portable workflow preserves mode, Manual draft, and seeded marker. Remap Storyboard source identity without copying transient errors or freezing compiled Auto prose as authority.
2. Existing connected workflows without mode metadata migrate to Auto.
3. Existing unconnected workflows without mode metadata migrate to Manual and preserve their current prompt as the Manual draft. Mark migrated Manual state seeded so a later connection cannot overwrite preserved user work, including an intentionally empty draft.
4. A new unconnected Video Generator begins in Manual because Auto is unavailable. Its seeded marker remains false until the user authors Manual content, enters Manual from valid Auto, or explicitly establishes an empty Manual draft; the first authored Manual mutation sets it true.
5. First connection may default an as-yet-unset mode to Auto. Once the user explicitly selects Manual, later Auto recompiles and reconnects do not override that persisted choice.
6. Disconnect makes Auto unavailable and presents Manual without overwriting either value. If Manual was never seeded, use the last currently valid Auto compile once as the disconnect seed; if no valid Auto exists, preserve a truthful empty Manual draft and set the marker once. Reconnection does not reseed Manual.
7. Never infer seeded state from string equality: a user may intentionally edit Manual until it exactly matches Auto. The explicit marker is authoritative.
8. Never persist transient C-04 bridge errors as Manual errors. Recalculate readiness from active mode after load.

## Updated ranked findings

1. **[P1 · Risk · high] The old one-owner state model is now insufficient.**
   - Evidence: the base report assumes connection atomically owns one displayed value and disconnect restores one prior Manual value.
   - Impact: a single `prompt` field or ownership flag can overwrite Manual, freeze Auto, or show the wrong composed preview.
   - Direction: maintain independent Auto derivation, Manual draft, seeded marker, and active mode; one visible textarea selects between them.
2. **[P1 · Risk · high] Storyboard readiness must be mode-scoped.**
   - Evidence: the prior C-04 contract correctly blocks Auto, but Manual explicitly excludes Storyboard prompt/timing/camera contribution.
   - Impact: retaining Auto bridge errors in Manual would falsely block valid manual generation; deleting them would hide unresolved Auto state on return.
   - Direction: retain background Auto readiness, expose/block it only in Auto, and use Manual's own empty/independent-requirement readiness in Manual.
3. **[P1 · Risk · high] Manual Reset competes with the native bottom-right resize grip.**
   - Evidence: the requested nearest pattern places Wand at bottom-right; the Video prompt remains vertically resizable.
   - Impact: a literal copy of `right: 7px; bottom: 7px` can cover the native resizer and regress an accepted interaction.
   - Direction: preserve the 28px/11px inset-action anatomy but shift it left to reserve a verified pointer-clear resize corner at every acceptance zoom.
4. **[P1 · Risk · high] Active-mode composition can tear during switching or Reset.**
   - Evidence: mode, display value, connected layers, errors, and composed preview cross renderer/shared boundaries.
   - Impact: the preview or submitted request could briefly or persistently use Auto text under Manual, or Manual text with Storyboard timing.
   - Direction: derive displayed value, readiness, composed preview, and request snapshot from one atomic active-mode resolution.
5. **[P2 · Risk · high] Existing segmented categories are useful analogues but not approved wholesale.**
   - Evidence: Cut/Continue is text/radio; Character intake is three icon+text modes; fidelity has a different `Auto` meaning.
   - Impact: blind reuse could add a row, confuse Auto with fidelity, or create contradictory accessibility semantics.
   - Direction: use the validated derived two-icon radiogroup specified here; do not reuse category nouns or geometry indiscriminately.

No P0 finding exists. These findings are resolved by this addendum's frozen contract and do not block Developer implementation.

## Updated automated acceptance

- Auto and Manual controls render in one `Video prompt mode` single-select group with exact icons, tooltips, selected state, roving keyboard behavior, and one Tab stop.
- Auto remains visible but tooltip-discoverably unavailable without Storyboard; mode geometry does not jump.
- First valid Auto → Manual transition seeds once, announces/discloses once, and sets the marker atomically.
- Auto changes after seeding never alter Manual. Manual edits never alter Auto. Repeated switches restore latest Auto and exact Manual independently.
- Equality between Manual and Auto never changes the seeded marker and never triggers reseeding.
- Auto continues recompiling while Manual is active without history/autosave churn from disposable derived text.
- Manual active request/composed preview contains no Storyboard prompt, timing, camera, transition, bridge, or Storyboard-only error text, while applicable non-Storyboard authorities remain.
- Manual empty blocks with Manual-specific C-04; Auto conflict does not block Manual. Returning to Auto restores current Auto conflict.
- Mode switch, typing, first seed, Reset, and authority changes update Composed Provider Prompt atomically to the active outgoing composition.
- Reset is Manual-only, uses `RotateCcw`, makes no provider call, replaces only Manual with latest valid Auto, stays in Manual, keeps focus, updates preview immediately, disables for equality/no valid Auto, and is one undoable dirty-state transaction.
- Reset never runs on mode switch, load, migration, reconnect, Auto compile, or equality detection.
- A running request preserves exact submitted mode/composition after every live change.
- Persistence/migration matrix covers new unconnected, new first connection, migrated connected, migrated unconnected non-empty, migrated unconnected empty, duplicate/remap, disconnect before seed, disconnect after seed, reconnect, deleted Storyboard, and stale cache/error fields.
- DOM identity, outer prompt geometry, user-resized height, scrollbar, focus, selection/copy/read-only behavior, native history, tag suggestions, and Canvas viewport remain correct per active mode.
- Automated geometry guards reserve the textarea content corridor for top-right mode controls and Manual Reset while preserving identical textarea/highlight wrapping and the native resize corner.

## Updated rendered acceptance

At exact `315px` node width, default adaptive Video Generator width/default zoom, one declared representative zoom, and `440px` application width, inspect:

1. connected Auto selected: short/long compiled text, read-only focus, selection/copy, scroll, mode tooltip, no Reset;
2. first Manual selection: one-time seed disclosure, editable seeded draft, focus retained on Manual control, no node-height shift;
3. Manual edited, Auto changed in background, repeated Auto↔Manual switches: each value resumes independently;
4. Auto conflict while Manual is active: Manual remains runnable if its own composition is valid; returning to Auto restores C-04 and blocked Run;
5. Manual empty: Manual-specific C-04, blocked Run, composed preview empty/blocked;
6. Manual with non-Storyboard Character/Style/reference layers: outgoing preview includes those layers and excludes Storyboard prompt/timing/camera;
7. Reset enabled, focused, activated, undo restored; Reset disabled for equality, invalid Auto, and disconnected Auto, with custom tooltips on pointer and keyboard focus;
8. bottom-right Reset versus native resize grip: both pointer targets remain independently operable with no overlap at every zoom;
9. top-right capsule and right content corridor: no text/highlight/selection/scrollbar collision, no broken wrapping mismatch, no clipping;
10. keyboard-only radiogroup, textarea traversal, Reset, Run, and tooltip sequence; VoiceOver announces group, selected mode, first seed once, read-only Auto, editable Manual, and current error once;
11. running Auto and running Manual snapshots while switching/editing/resetting live next-run state;
12. disconnect/reconnect and migrated fixtures with preserved Manual draft/seeded marker.

Measure and record:

- ownership capsule outer height `22px`, two equal `22 × 22px` hit regions, `11px` icons, `7px` top/right inset;
- Manual Reset `28 × 28px`, `11px` icon, pointer-clear native resize corner, and no text/scrollbar collision;
- unchanged outer prompt min/max/user-resized height and no mode-switch layout shift;
- selected/inactive/hover/focus/disabled contrast and non-color distinction;
- tooltip viewport containment at default and representative zoom;
- zero added row, label band, status dead space, persistent success, or green state.

## Updated verdict

**APPROVED FOR DEVELOPER**

The two-mode decision supersedes Auto-only ownership but remains compatible with the prior read-only and error contracts:

- Auto is live compiler-owned and read-only;
- Manual is independently persistent and editable;
- first Manual entry seeds once from current valid Auto, then never reseeds automatically;
- Auto never freezes, Manual never gets overwritten by switching;
- active mode alone owns outgoing composition/readiness;
- Reset is a Manual-only, provider-free, no-confirmation, undoable `RotateCcw` action using the adapted inset prompt-action pattern;
- no extra row, selector, modal, visible ownership label, AI icon, success chrome, or green state is authorized.

This remains pre-code authorization, not final visual approval. Developer must return one frozen implementation snapshot with the automated matrix and bounded rendered evidence above. Final visual verdict remains `SOURCE CONTRACT APPROVED; VISUAL UNVERIFIED` until that evidence passes.

# Post-code stable snapshot review

## Stable snapshot and hash gate

- Manifest: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/reviews/prism-camera-bridge-all-prebuild.json`.
- Snapshot: `Prism camera bridge Auto/Manual stable pre-build`.
- Gate: **PASS**. Every one of the 24 manifest entries matched both declared byte count and SHA-256 before any implementation file was inspected.
- Active boundary: `AppNext.tsx` imports `./NodeCardNext`; the manifest identifies `NodeCardNext.tsx` as active and declares inactive legacy unedited.
- Review scope stayed within the manifest-listed renderer files (`AppNext.tsx`, `NodeCardNext.tsx`, `TaggedPromptTextarea.tsx`, `styles-next.css`, and the renderer ownership contract), the manifest-listed approved plan, and this existing Designer report. No source, tests, canonical docs, skills, profiles, Obsidian content, build, package, provider, or UI operation was performed.
- Manifest-reported verification was treated as supplied evidence, not rerun: 22/22 test files and 318/318 tests passed; typecheck passed; build/package/open UI were not run.

## Findings

1. **[P1 · Defect · high] Manual Reset's tooltip wrapper creates layout and changes its positioning owner.**
   - Axis: no-extra-chrome geometry, Reset placement, resize containment.
   - Evidence: `NodeCardNext.tsx:1539` renders the Manual Reset button inside `PlayTooltip`. The shared wrapper is the normal-flow `.play-tooltip-anchor`, a positioned `31 × 31px` span (`styles-next.css:1823–1828` in the manifest-listed stylesheet). `.video-prompt-reset` is absolute (`styles-next.css:698`) and therefore anchors to that positioned span, not directly to `.video-prompt-owner-shell`. No prompt-local override makes the wrapper absolute or zero-footprint.
   - Contract impact: the wrapper can add a row/height after the textarea, while `right: 36px; bottom: 7px` resolves against the 31px wrapper rather than the prompt shell. This fails the approved inset bottom-right placement, no-extra-row contract, stable prompt geometry, and reliable resize-grip separation.
   - Direction: Developer must give the Reset tooltip anchor a prompt-local absolute, zero-flow geometry owned by the prompt shell, or use an equivalent shared tooltip path that preserves disabled discoverability without introducing layout. Re-prove Reset and the native resize grip as independent pointer targets.

2. **[P1 · Defect · high] Live Auto compiler failures block Run but do not reliably enter the visible C-04 row.**
   - Axis: actionable-error category, state truth, Run blocking.
   - Evidence: `AppNext.tsx:5286–5306` derives `autoError` live inside `videoPromptState`, but `NodeCardNext.tsx:985` derives the visible lifecycle error only from persisted `data.error`. `setVideoPromptMode` copies `autoError` into `data.error` only during a mode switch (`AppNext.tsx:5309–5315`). A Storyboard edit that creates a blank/bridge conflict while Auto is already selected updates the derived state and request readiness, but no inspected visible-render path maps current `videoPrompt.autoError` into `displayError`/`visibleStatus`.
   - Contract impact: Run can become disabled through request inspection while the required persistent, actionable C-04 explanation is absent until the user switches modes. That fails the explicit blank/bridge conflict presentation and makes a live compile appear silently empty/broken.
   - Direction: map the current active Auto error directly into the existing C-04 lifecycle category in the same render/readiness resolution; do not require mode switching or persist transient bridge errors merely to show them. Manual must continue suppressing Auto-only conflicts while retaining them for return to Auto.

3. **[P1 · Defect · high] The reserved text corridor is narrower than both approved overlays and is not applied symmetrically to textarea/highlight content.**
   - Axis: text geometry, wrapping parity, control collision.
   - Evidence: the mode capsule occupies two `22px` tracks plus its border and sits `7px` from the right (`styles-next.css:693–696`), while Reset is `28px` wide at `right: 36px` (`styles-next.css:698`). The only reservation is `padding-right: 42px` on the textarea and the outer `.tagged-prompt-highlight` container (`styles-next.css:690–692`); the highlighted `<pre>` retains the base `13px` right padding (`styles-next.css:292–293`).
   - Contract impact: the Auto capsule extends farther into the content than the 42px corridor, Manual text can enter Reset's painted area, and textarea/highlight layers do not share the same effective content inset. This can produce text/control overlap and mismatched wrapping/selection at 315px and zoomed states.
   - Direction: reserve a content-safe corridor at least as wide as the farthest overlay plus approved gap, and apply identical effective padding/content width to the real textarea and highlighted `<pre>`. Do not pad only the highlight container. Keep the scrollbar and native resize corner outside the text corridor.

4. **[P1 · Defect · high] Disabled Auto has no keyboard/pointer-discoverable tooltip owner.**
   - Axis: mode tooltip accessibility, disconnected state.
   - Evidence: `NodeCardNext.tsx:1523` places `data-tooltip="Connect a Storyboard to use Auto"` directly on a native disabled button with `tabIndex=-1`; unlike disabled Run/Reset, it has no focusable tooltip wrapper. Disabled native buttons do not provide the required focus target and commonly do not dispatch the pointer events used by the shared tooltip system.
   - Contract impact: disconnected Manual users cannot discover why Auto is unavailable from the required keyboard-focus tooltip path. This fails the approved persistent two-control geometry/accessibility state.
   - Direction: preserve Auto's visible disabled slot but route its explanation through a focusable, prompt-local tooltip owner that does not add layout or contradictory radio semantics.

5. **[P2 · Defect · high] The ownership capsule has no authored inactive hover treatment.**
   - Axis: selected/inactive/hover distinction.
   - Evidence: `styles-next.css:693–697` defines base, selected, and focus states, but no `.video-prompt-mode button:hover` state. The accepted contract requires hover to remain visibly distinct from selected while still acknowledging interactivity.
   - Contract impact: an inactive mode has no product-specific hover feedback, weakening the two-option interaction and leaving final appearance to browser/default behavior.
   - Direction: add the restrained neutral/purple inactive hover treatment from the validated category without matching the selected fill.

6. **[P2 · Risk · high] The required one-time first-seed disclosure is not represented in the visible contract.**
   - Axis: mode transition feedback, content trust.
   - Evidence: `NodeCardNext.tsx:1524` changes Manual's tooltip directly from `Start from the current Auto prompt` to `Edit your saved draft` based on `manualPromptSeeded`. No inspected renderer state exposes `Draft copied once from the current Auto prompt` or a one-time polite announcement after first seeding.
   - Contract impact: the seed may be behaviorally correct but the user receives no explicit confirmation that a copy occurred once and future switching will preserve it independently.
   - Direction: provide the approved one-time tooltip/announcement without adding a status row, success color, or persistent chrome.

## Accepted source-level criteria

- **Hash and active-boundary integrity:** all manifest hashes/byte counts pass; `AppNext.tsx` remains the active importer of `NodeCardNext.tsx`.
- **Approved controls only:** the manifest-listed visible renderer contains the Auto/Manual capsule, hidden ownership help, and Manual Reset. Searches of the visible renderer found no bridge selector, bridge modal, FOV badge, camera-bridge panel, success banner, or other visible camera-bridge UI. Source-level bridge presentation therefore does not invent visible UI beyond the approved controls and actionable error path.
- **Auto/Manual anatomy:** `NodeCardNext.tsx:1522–1524` uses one `Video prompt mode` radiogroup, `Clapperboard` and `PencilLine` at 11px, truthful radio checked state, roving tab indices, and Arrow/Home/End handling (`NodeCardNext.tsx:1001–1011`). CSS establishes the requested 22px capsule and two 22px tracks (`styles-next.css:693–696`).
- **Native Auto read-only contract:** the same `TaggedPromptTextarea` receives `readOnly` and `aria-readonly` in Auto, remains mounted/focusable/selectable/scrollable/resizable, and retains full prompt color/selection treatment (`NodeCardNext.tsx:1526–1538`; `styles-next.css:281–315`). `TaggedPromptTextarea.tsx:27` suppresses tag suggestions whenever `props.readOnly`; the native textarea owns edit/paste/cut/delete/drop/IME prevention without disabled dimming.
- **Manual editable path:** Manual removes `readOnly`, restores available tags, and writes through `updatePrompt`, which targets `manualPromptDraft` and marks it seeded in Manual (`NodeCardNext.tsx:1526–1536`; `AppNext.tsx:4610–4618`).
- **Independent active display:** `videoPromptState` derives current Auto through `buildGenerationRequest`, keeps Manual separate, and selects `activePrompt` by current mode (`AppNext.tsx:5286–5306`). The node renders that one active value. The inspector's Composed Provider Prompt is generated from `inspectGenerationRequest(inspectorNode, nodes, edges)` (`AppNext.tsx:5495–5503, 6297`), so the visible preview follows request assembly rather than a second hand-authored preview string; exact shared composition behavior remains supported by the manifest-reported passing tests.
- **Manual Reset action semantics by source:** Reset renders only in Manual, uses `RotateCcw` at 11px, is disabled when disconnected/no valid Auto/equal, and calls only `resetManualPrompt`. The handler guards invalid/equal state and replaces Manual from current Auto through the dedicated state helper without switching mode or invoking a provider (`NodeCardNext.tsx:1539`; `AppNext.tsx:5317–5322`). No confirmation modal or success status was added.
- **Immutable request boundary:** live prompt state is derived separately from request activation; manifest-reported tests cover mode behavior. No renderer source was found that mutates an in-flight payload after switching/editing/resetting.
- **No green completion UI:** the new prompt mode/reset CSS uses neutral and purple states. Existing C-04 remains rose with a non-color left rule (`styles-next.css:685–700`). No camera-bridge success row was added.
- **Existing outer prompt contract retained:** base `48px` minimum, `120px` maximum, `9px` type, `1.45` line-height, existing divider/material, native scrollbar, resize strokes, and one prompt shell remain (`styles-next.css:281–315`). Finding 3 blocks acceptance of the new internal overlay corridor, not the unchanged outer baseline.

## Automated and rendered evidence boundary

- The manifest reports focused tests and typecheck green, but the reviewed ownership contract is source-string/CSS-regex evidence; it does not exercise real pointer delivery, disabled tooltip focus, native selection/copy, IME/drop prevention, Reset undo/focus, DOM height, scroll retention, or live C-04 rendering.
- No build or UI open exists in this snapshot. Therefore exact 315px node width, default zoom, representative zoom, 440px application width, tooltip containment, selected/inactive visual balance, text/highlight wrapping, Reset/resize-grip collision, focus stability, live recompile layout, disconnect restoration, and rendered C-04 behavior remain **unverified**.
- Because findings 1–4 are source-level contract failures, the candidate is not ready to advance merely to obtain rendered evidence. Developer must repair them first, add bounded behavioral/DOM regressions, return a new hash-frozen pre-build manifest, and then proceed to the rendered gate.

## Verdict

**BLOCKED**

The hash gate passes and core Auto/Manual/read-only architecture is present, but build authorization is blocked by four contract failures: Reset's wrapper adds/misanchors layout, live Auto conflicts are not reliably visible as C-04, the prompt corridor permits text/highlight/control collisions, and disabled Auto lacks an accessible tooltip owner. The inactive hover and first-seed disclosure are bounded follow-up defects.

## Developer handoff

- Apply: findings 1–6 only.
- Preserve: one prompt surface; 22px Clapperboard/PencilLine radiogroup; native Auto read-only semantics; independent live Auto/Manual state; Manual-only provider-free Reset; active-mode request composition; existing C-04 language; no green state; no new bridge UI.
- Add behavioral evidence for: live Auto conflict → visible persistent C-04 + blocked Run; disabled Auto tooltip on pointer/keyboard; Reset exact prompt-shell placement, focus, one-step Undo, and native resize grip; textarea/highlight equal wrapping; first seed once and disclosure once.
- New stable snapshot: return a fresh manifest with verified hashes after the bounded fixes. Re-review only `AppNext.tsx`, `NodeCardNext.tsx`, `TaggedPromptTextarea.tsx`, `styles-next.css`, and directly affected renderer behavioral tests.
- Rendered gate after source acceptance: exact 315px, default adaptive width/default zoom, one named representative zoom, and 440px application width across Auto, Manual, first seed, repeat switching, conflict, Reset enabled/disabled/undo, disconnect/reconnect, focus/copy/scroll/resize, and Composed Provider Prompt states.

# Post-code stable snapshot review

## Stable snapshot v2 and hash gate

- Manifest: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/reviews/prism-camera-bridge-all-prebuild-v2.json`.
- Snapshot: `Prism camera bridge Auto/Manual stable pre-build v2`.
- Gate: **PASS**. All 24 manifest entries matched both declared byte count and SHA-256 before implementation inspection.
- Active boundary remains `AppNext.tsx` → `./NodeCardNext`; inactive legacy is declared unedited.
- Review scope remained the manifest-listed visible renderer files, renderer ownership contract, approved plan, and this existing Designer report. No source, tests, canonical docs, skills, profiles, Obsidian content, build, provider, package, or UI operation was performed.
- Manifest-reported gate: 22/22 test files, 320/320 tests, and typecheck passed. Build/package/open UI remain unrun.

## Resolution of prior findings

- **Prior finding 1 resolved by source geometry:** `.video-prompt-reset-tooltip` is now absolute and zero-flow, so it no longer appends a 31px row; the Reset button resolves to the prompt-owned bottom-right anchor (`styles-next.css:693, 702–704`; `NodeCardNext.tsx:1554`).
- **Prior finding 2 resolved by category mapping:** active Auto now selects `videoPrompt.autoError || displayError`, and that value feeds `nodeNotificationCategory`/`visibleStatus` (`NodeCardNext.tsx:1014–1015, 1122–1125`). Manual continues using only its own persisted error state.
- **Prior finding 3 resolved by source geometry:** textarea and highlight `<pre>` now share an explicit `76px` right corridor, sufficient by source arithmetic for the top-right capsule and bottom-right Reset (`styles-next.css:690–692`).
- **Prior finding 4 partially resolved:** disabled Auto now uses `PlayTooltip`, retaining a visible 22px slot and a focusable explanation owner (`NodeCardNext.tsx:1536–1538`; `styles-next.css:694–695`). The exact keyboard implementation introduces the blocker below.
- **Prior finding 5 resolved:** inactive enabled mode has a restrained hover treatment distinct from selected (`styles-next.css:699–700`).
- **Prior finding 6 resolved:** first seeding drives a 5200ms Manual tooltip variant and a polite visually hidden one-time announcement (`NodeCardNext.tsx:838–850, 1538, 1553`).

## Findings

1. **[P1 · Defect · high] Arrow-key navigation from selected Auto cannot reach Manual.**
   - Axis: radiogroup keyboard semantics.
   - Evidence: `handleVideoPromptModeKey` searches `event.currentTarget.parentElement` for `[role="radio"]` (`NodeCardNext.tsx:1016–1024`). The Auto radio is now nested inside `PlayTooltip` (`NodeCardNext.tsx:1537`), so its parent is the tooltip span, not `.video-prompt-mode`. From Auto, the query returns only the Auto button; ArrowRight computes the same button and never selects/focuses Manual. The Manual button's parent remains the radiogroup, producing asymmetric behavior.
   - Contract impact: fails the approved Left/Right/Home/End two-radio keyboard contract and traps keyboard users on Auto when Auto is selected.
   - Direction: resolve the owning `.video-prompt-mode` group explicitly (for example via `closest`) and collect both radios through the wrapper. Add a mounted behavioral test for Auto ArrowRight → Manual and Manual ArrowLeft → Auto, including focus and checked state.

2. **[P1 · Defect · high] Disabled Auto's tooltip wrapper adds a second, unnamed tab stop instead of preserving the selected-mode tab stop contract.**
   - Axis: disabled tooltip accessibility, focus order, radiogroup semantics.
   - Evidence: when disconnected, Auto's native radio is disabled and `tabIndex=-1`, while `PlayTooltip disabled` makes its generic wrapper span focusable. Manual remains the selected radio at `tabIndex=0` (`NodeCardNext.tsx:1536–1538`; shared `PlayTooltip` behavior at `NodeCardNext.tsx:368–422`). The wrapper has `aria-describedby` but no prompt-specific accessible name/role; the child's `aria-label` does not name the focused parent span.
   - Contract impact: disconnected mode selection has two Tab stops rather than one selected radio stop, and the first is a generic wrapper whose purpose may not be announced clearly. This does not satisfy the approved discoverable-disabled-help and radiogroup focus contract together.
   - Direction: provide one semantically named disabled-help focus owner without adding an extra unexplained group stop, or integrate disabled explanation into a roving group pattern that keeps Manual as the operative radio. Verify screen-reader name, description, focus order, and no contradictory radio state.

3. **[P1 · Defect · high] Disabled Manual Reset has a zero-size keyboard focus target and therefore no reliable visible focus indicator.**
   - Axis: Reset disabled tooltip/focus accessibility.
   - Evidence: `.video-prompt-reset-tooltip` is intentionally `width: 0; height: 0; min-width: 0` (`styles-next.css:693`). When Reset is disabled, `PlayTooltip` places keyboard focus on that wrapper span, while the nested native button is disabled (`NodeCardNext.tsx:1554`). The shared focus outline belongs to `.play-tooltip-anchor:focus-visible`; on this zero-size anchor it cannot outline the visible 28px Reset control.
   - Contract impact: layout is now stable, but keyboard users receive an invisible focus target disconnected from the painted disabled Reset, failing stable focus, visible focus, and discoverable disabled-tooltip requirements.
   - Direction: make the Reset tooltip wrapper itself an absolute, zero-flow **28 × 28px** anchor at the approved position and let the painted button fill it, rather than using a zero-size focus box with an offset absolute child. Preserve `right: 36px`, `bottom: 7px`, and the native resize-grip clearance.

## Accepted source-level criteria

- The v2 hash gate and active boundary pass.
- One prompt surface remains; no bridge selector, FOV badge, camera panel, modal, completion banner, or other unapproved visible camera-bridge UI appears in the manifest-listed renderer.
- The 22px capsule, two 22px icon tracks, 11px Clapperboard/PencilLine icons, selected/inactive/hover colors, and no extra ownership row are present by source.
- Auto remains one native `readOnly` textarea at full prompt contrast with selection, scrolling, and resize styling; suggestions are suppressed in `TaggedPromptTextarea` when read-only. Manual restores editing and tag suggestions.
- Live Auto error now reaches the existing rose/non-color C-04 row; no green camera-bridge status was introduced. Request inspection continues to own Run blocking.
- Manual seed disclosure, independent Auto/Manual display, current active-mode request preview, provider-free no-confirmation Reset handler, and no mode-switch Reset are present by source and supported by the manifest-reported tests.
- The 76px corridor is applied to both textarea and highlighted `<pre>`, preserving source-level wrapping parity.
- Reset's layout owner and resize-corner offset are structurally corrected; only the disabled keyboard focus box remains defective.

## Rendered evidence boundary

- Build and UI open remain unrun. Exact 315px node width, default zoom, representative zoom, 440px application width, actual text wrapping, pointer delivery, tooltip containment, Reset/resize-grip separation, focus retention, native copy/edit prevention, disconnect restoration, and Composed Provider Prompt appearance remain unverified.
- Rendered visual acceptance is appropriately deferred until after a source-clean pre-build snapshot. The three keyboard/focus defects above are directly observable from source and should be repaired before build authorization.

## Verdict

**BLOCKED**

The six prior findings are substantially repaired, but build authorization remains blocked by asymmetric radiogroup Arrow-key navigation, an extra unnamed disconnected Auto tooltip tab stop, and a zero-size disabled Reset focus target. These are bounded interaction/accessibility defects; no redesign is requested.

## Developer handoff

- Apply: v2 findings 1–3 only.
- Preserve: every accepted v2 criterion, hashes outside the bounded fixes, 22px capsule, 76px corridor, active C-04 mapping, one-time seed disclosure, no extra camera UI, and Reset's visual `right: 36px; bottom: 7px` placement.
- Add mounted behavioral coverage for both-direction Arrow/Home/End navigation, disconnected focus order/name/description, and disabled Reset visible focus plus tooltip.
- Return a fresh hash-frozen pre-build manifest. Re-review only `NodeCardNext.tsx`, `styles-next.css`, the active ownership behavioral test, and any directly necessary tooltip helper if changed.
- After source acceptance, run the unchanged rendered gate at 315px, default adaptive width/default zoom, one named representative zoom, and 440px application width.

# Post-code stable snapshot review

## Stable snapshot v3 and hash gate

- Manifest: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/reviews/prism-camera-bridge-all-prebuild-v3.json`.
- Snapshot: `Prism camera bridge Auto/Manual stable pre-build v3`.
- Gate: **PASS**. All 24 manifest entries matched declared byte count and SHA-256 before implementation inspection.
- Active boundary remains `AppNext.tsx` → `./NodeCardNext`; inactive legacy is declared unedited.
- Scope remained the manifest-listed visible renderer files, renderer ownership contract, approved plan, and this Designer report. No source, tests, canonical docs, skills, profiles, Obsidian content, build, provider, package, or UI operation was performed.
- Manifest-reported gate: 22/22 test files, 320/320 tests, and typecheck passed. Build/package/open UI remain unrun.

## Resolution of v2 findings

- **Arrow discovery repaired:** the handler now resolves the closest `.video-prompt-mode` and discovers both radios through the group (`NodeCardNext.tsx:1016–1024`). Connected Auto↔Manual Arrow/Home/End selection is symmetric by source.
- **Disconnected Auto wrapper removed:** Auto is one named `aria-disabled` radio with guarded activation and no extra tooltip wrapper/tab stop (`NodeCardNext.tsx:1536–1538`). Its help remains on the radio through `data-tooltip`.
- **Reset focus repaired:** Reset is now the painted 28px focus owner, uses guarded `aria-disabled` rather than a zero-size wrapper, and retains `right: 36px; bottom: 7px` (`NodeCardNext.tsx:1554`; `styles-next.css:698–701`).
- All accepted v2 geometry, C-04 mapping, 76px corridor, seed disclosure, read-only behavior, hover/selected state, and no-extra-camera-UI rules remain present.

## Finding

1. **[P1 · Defect · high] Tab does not exit the radiogroup after keyboard users inspect unavailable Auto.**
   - Axis: roving radio focus order and disabled-help semantics.
   - Evidence: disconnected Manual is selected and has `tabIndex=0`; unavailable Auto has `tabIndex=-1` (`NodeCardNext.tsx:1536–1538`). ArrowLeft/Home from Manual programmatically focuses the `aria-disabled` Auto radio without selecting it (`NodeCardNext.tsx:1016–1024`). Because Manual remains the next tabbable element in DOM order, pressing Tab from the now-focused `tabIndex=-1` Auto radio advances to Manual instead of exiting the group.
   - Contract impact: the approved keyboard contract says one Tab stop enters the selected mode, arrows inspect/change modes, and Tab exits. This path forces a second in-group Tab stop after inspecting disabled Auto and makes focus order dependent on how the user reached it.
   - Direction: preserve one selected-mode entry stop and unavailable Auto's keyboard-discoverable help, but ensure Tab/Shift+Tab leave the group from any programmatically focused mode. A bounded key handler or roving-focus state may do this; do not add a wrapper or second permanent tab stop. Add mounted coverage for disconnected Manual → ArrowLeft/Home to Auto help → Tab exits forward and Shift+Tab exits backward.

## Accepted source-level criteria

- v3 hash and active-boundary gates pass.
- The 22px Clapperboard/PencilLine radiogroup, 11px icons, selected/inactive/hover/focus styling, current tooltips, and no extra row/chrome remain intact.
- Connected two-way Arrow/Home/End mode selection is structurally repaired; unavailable Auto is visibly retained, semantically named, guarded from activation, and reachable by group navigation for its explanation.
- Auto remains native `readOnly`, full-strength, focusable, selectable, copyable, scrollable, resizable, and suggestion-free. Manual remains editable and independently persistent.
- One-time first seed, later independent switching, active-mode display/request preview, and disconnected Manual restoration remain supported by the unchanged active state path and manifest-reported tests.
- Manual Reset is one painted `RotateCcw` button, Manual-only, provider-free, no-confirmation, guarded when equal/unavailable, focus-visible, and offset from the native resize corner. No reset occurs on mode switching.
- Live Auto blank/bridge error continues through the existing persistent C-04 row and Run readiness; no green status appears.
- Existing outer prompt height/type/material/scroll/resize contract and symmetric 76px textarea/highlight corridor remain present.
- No source-level bridge selector, FOV badge, camera panel, modal, completion banner, or other unapproved camera-bridge UI exists in the visible renderer.

## Rendered evidence boundary

- Build and UI open remain unrun. Therefore 315px, default zoom, representative zoom, 440px application width, actual painted balance, tooltip containment, pointer delivery, native resize-grip clearance, focus/layout stability, copy/edit prevention, disconnect restoration, and Composed Provider Prompt appearance remain unverified.
- The remaining finding is a deterministic keyboard-order failure visible from source. Repair it before build authorization; no visual redesign is required.

## Verdict

**BLOCKED**

The v2 blockers are repaired, but the exact radiogroup contract still fails after a disconnected user arrows to unavailable Auto: Tab returns to Manual instead of leaving the group. Build authorization is withheld for this single bounded focus-order defect.

## Developer handoff

- Apply: v3 finding 1 only.
- Preserve: all accepted v3 criteria and the existing visual geometry.
- Add one mounted disconnected keyboard regression covering entry, unavailable Auto help, Tab exit, and Shift+Tab exit.
- Return a fresh hash-frozen pre-build manifest limited to the bounded mode-key handler and direct behavioral coverage.
- After source acceptance, proceed to the unchanged rendered gate at 315px, default adaptive width/default zoom, one named representative zoom, and 440px application width.

# Post-code stable snapshot review

## Stable snapshot v4 and hash gate

- Manifest: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/.hermes/reviews/prism-camera-bridge-all-prebuild-v4.json`.
- Snapshot: `Prism camera bridge Auto/Manual stable pre-build v4`.
- Gate: **PASS**. All 24 manifest entries matched declared byte count and SHA-256 before implementation inspection.
- Active boundary remains `AppNext.tsx` → `./NodeCardNext`; inactive legacy is declared unedited.
- Scope remained the manifest-listed visible renderer files, renderer ownership contract, approved plan, and this Designer report. No source, tests, canonical docs, skills, profiles, Obsidian content, build, provider, package, or UI operation was performed.
- Manifest-reported gate: 22/22 test files, 321/321 tests, and typecheck passed. Build/package/open UI remain unrun.

## Resolution of v3 blocker

- The mode group now owns an independent roving-focus state initialized from the selected mode and synchronized when selected mode changes (`NodeCardNext.tsx:832–836`).
- Arrow/Home/End updates the roving mode before focus, while unavailable Auto remains unselected and guarded from activation (`NodeCardNext.tsx:1019–1032`).
- Both radios derive `tabIndex` from the roving mode, so after disconnected Manual → ArrowLeft/Home → unavailable Auto, Auto becomes the sole `tabIndex=0` group control and Manual becomes `-1` (`NodeCardNext.tsx:1543–1545`). Tab and Shift+Tab therefore leave the group rather than returning to Manual.
- When focus leaves the radiogroup, `onBlurCapture` resets roving focus to the actual selected mode, restoring Manual as the next entry stop without changing prompt mode (`NodeCardNext.tsx:1543`).
- This resolves the v3 focus-order defect without a wrapper, second permanent tab stop, visual change, or activation of unavailable Auto.

## Accepted source-level contract

- **Mode anatomy and hierarchy:** one 22px top-right capsule, two 22px tracks, 11px Clapperboard/PencilLine icons, exact selected/inactive/hover/focus treatment, no label row, modal, selector, or added ownership chrome.
- **Keyboard and tooltips:** one roving entry stop; connected Auto↔Manual Arrow/Home/End selection; unavailable Auto remains focusable through group navigation for its named tooltip but cannot activate; Tab/Shift+Tab exits from the current roving radio; blur restores entry to selected mode.
- **Auto native read-only:** the existing textarea remains full-strength, focusable, selectable, copyable, scrollable, and resizable. Native `readOnly`/`aria-readonly` apply; tag suggestions are suppressed; no separate disabled editor or prompt surface exists.
- **Manual ownership:** Manual restores editing and available tags; first entry seeds once, disclosure appears once, later switches preserve the independent draft, and Auto continues deriving live in the background.
- **Active composition:** one mode-derived active prompt feeds display and request inspection; Composed Provider Prompt remains request-derived from the active node state. Running requests retain their submitted snapshot by the unchanged request boundary and manifest-reported tests.
- **Manual Reset:** one bottom-right 28px `RotateCcw` painted button at `right: 36px; bottom: 7px`; Manual-only, provider-free, no-confirmation, guarded by `aria-disabled` when equal/unavailable, focus-visible, and independent of mode switching. The dedicated helper and manifest-reported tests support one explicit Auto→Manual replacement and undo/history behavior.
- **C-04 and Run:** current Auto blank/bridge error maps directly to the existing persistent rose/non-color lifecycle category and request readiness blocks Run. Manual suppresses Auto-only conflict. No green camera-bridge status or success band exists.
- **Live stability and restoration:** one textarea DOM surface and fixed outer prompt geometry remain; external Auto value changes do not add wrappers or height animation. Disconnected state resolves to Manual and preserves the independent draft through the approved mode state/migration path.
- **Geometry and language:** existing `48px` minimum, `120px` maximum, `9px`/400/`1.45`, material/divider, scrollbar, resize strokes, and symmetric 76px textarea/highlight corridor remain. C-04 retains `28px` minimum, `8px`/400/1.25, horizontal inset, natural expansion, and non-color cue.
- **No invented bridge UI:** visible renderer search found no bridge selector, FOV badge, camera panel, bridge modal, completion banner, or other source-level camera-bridge presentation beyond the approved Auto/Manual controls, hidden ownership help, Manual Reset, and actionable error text.

## Findings

- No source-level P0, P1, P2, or P3 finding remains in the reviewed v4 scope.

## Automated and rendered evidence boundary

- The manifest reports the focused behavioral/shared gate and typecheck green. This authorizes the build phase; it is not rendered visual approval.
- Build and UI open remain unrun. Exact 315px node width, default adaptive width/default zoom, one named representative zoom, 440px application width, painted tooltip containment, selected/inactive balance, native selection/copy, Reset/resize-grip pointer separation, focus retention during live recompile, disconnect/reconnect behavior, two-line C-04 expansion, and Composed Provider Prompt appearance remain **rendered-unverified**.
- Developer must build one frozen candidate and return the deterministic rendered matrix already defined in this report. No provider inference is required.

## Verdict

**APPROVED FOR BUILD**

The v4 stable pre-build snapshot satisfies the approved source-level Auto/Manual ownership, native read-only, Manual Reset, C-04, geometry, keyboard/focus, composition, and no-extra-camera-UI contracts. Build authorization is granted for one bounded candidate. Final design approval remains `SOURCE CONTRACT APPROVED; VISUAL UNVERIFIED` until the 315px/default zoom/representative zoom/440px rendered gate passes.

## Developer handoff

- Preserve the exact v4 source snapshot through build unless a build failure requires a new hash-frozen review.
- Build/package/open one bounded Flight Tester candidate under Developer's established workflow; do not invoke a provider.
- Return deterministic rendered evidence for every state and measurement already listed in the Auto/Manual addendum, including keyboard focus, Reset enabled/disabled/undo, resize grip, active-mode Composed Provider Prompt, C-04 conflict/correction, disconnect/reconnect, and running-snapshot stability.
- Designer re-review target is rendered evidence only plus any exact source file changed after this manifest.
