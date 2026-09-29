# Storyboard Ordered Duration Budget — Designer Review

## Design read and scope

- **Design read:** Prism Storyboard is a dense, fixed-width planning node for authors arranging ordered shots. In Single Sequence, one target duration is an ordered total budget; each earlier panel reduces the time available to later panels. The interface must preserve authored panels and locked values while making exhausted time obvious, reversible, and impossible to submit downstream.
- **Scope:** read-only pre-implementation plan review. Target/source edits: none. UI, provider, build, package, and tests: not run.
- **Stable snapshot:** plan and active next-generation evidence were frozen for this review by SHA-256:
  - plan `ef5cc736b18e09b9797fb332a203fb1e98e766367bb7cc0422f845c50e0b33ca`
  - `UtilityNodes.tsx` `71faf879ef38385a413b8665b71636483caf44d4ab9b8de36b7115d0bd060d40`
  - `styles-next.css` `e5bf3fbcea21cb00bfa7906d9dfaa4fd8127bcc55e593c40720f0a64fa6554ef`
- **Protected implementation boundary:** existing Prism design/source remains read-only. This new review path was reserved as post-cutoff Designer work. Legacy `App.tsx` and `styles.css` were not inspected.

## Applicable specialist routing

- **Designer Supervision:** applied for the pre-code contract, one-writer boundary, stable-snapshot gate, ranked findings, and Developer handoff.
- **Iris / Design Inspector:** applied first because this is existing Prism product UI. It preserves Prism’s flat dark identity, compact node system, and protected-design boundary.
- **Hallmark Audit:** applied read-only for hierarchy, interaction states, accessibility, responsive robustness, design-system coherence, and content honesty.
- **shadcn Select:** reference only. The useful precedent is that disabled Select items remain semantically disabled and cannot be selected or entered by normal roving focus. Prism has no `components.json`; no shadcn component, dependency, token system, or conversion is authorized.
- **Taste / anti-slop:** not loaded or applied. This is dense product UI with an established system, not a landing page, portfolio, or new visual-direction assignment. Only the general principle of avoiding decorative state noise is retained.

## Non-competing supervision boundary

Developer is the sole source/integration writer and owns implementation, tests, build, packaging, and the final Flight Tester handoff. Designer owns this contract and a bounded stable-snapshot re-review only. Designer must not edit source, tests, packages, the implementation plan, or existing Prism documents while Developer implements. The dependency order is: frozen contract → Developer implementation → focused automated gates → one stable candidate → user-owned manual checks → bounded Designer re-review if requested.

## Accepted interaction and visual contract

### 1. Budget semantics

1. **Single Sequence** uses one ordered total budget. Reconciliation proceeds left to right.
2. Target `5s`, Panel 1 `3s` makes Panel 2’s selectable ceiling `2s`; `3s–5s` remain present in the menu and disabled.
3. Target `5s`, Panel 1 `5s` makes Panel 2 persist and display numeric `0s`; `1s–5s` remain present and disabled. `0s` is system-generated, never an authored choice, and never becomes `Auto`.
4. **Separate Shots** ignores aggregate consumption and retains the independent selected-model per-panel maximum.
5. Downstream request assembly blocks the first `0s` panel without dropping, merging, renumbering, or manufacturing time for it. Text Revamp remains eligible when its existing prompt/lock rules allow it.
6. Locked positive durations are reservations. They are never silently clamped. Impossible lock states preserve the panel and value, show one actionable conflict, and block downstream generation.
7. No hidden desired-duration memory is introduced. When budget returns, unlocked zero panels recover left to right to `1s`; positive clamped values do not automatically expand.

### 2. Compact node geometry and rhythm

- Preserve the canonical **315px fixed node width**.
- Preserve the current topbar grid, **44px Storyboard Duration track**, **4px topbar column gap**, **28px compact control height**, **7px topbar padding**, **8px panel-grid padding**, **7px panel gap**, **5px panel-compose inset**, and **5px metadata-row gap** unless rendered evidence proves a localized collision.
- Preserve Storyboard Duration and panel Duration triggers at **8px / 400**. Duration option rows are **10px / 400**, following the governing closed-value `8px` and menu-row `+2px` hierarchy. Do not enlarge unrelated Storyboard controls in this task.
- Keep menu labels short (`0s`, `1s`…); explanatory reasons belong in accessible description/title text, not in the painted option label or width calculation.
- Preserve continuous viewport anchoring, painted-glyph width measurement, viewport clamping, opening direction, genuine-overflow scrollbar behavior, and current maximum menu heights. The new state must not feed disabled-reason copy into intrinsic menu width.

### 3. Enabled and disabled duration options

- **Enabled option:** existing menu surface `#1a181e`, foreground `#aaa4ae`, full opacity, pointer cursor, existing hover/selected surface `#2a2630`, and normal selection behavior. Measured source-color contrast is `7.23:1` on the default menu surface.
- **Disabled positive option:** foreground `#8e8999` on `#1a181e`, full opacity, no hover/selected fill, and `cursor: not-allowed`. Measured contrast is `5.19:1` on the default menu surface. Do not use parent or row opacity to grey text; opacity would compound with the locked-panel treatment and make compact type unnecessarily faint.
- Add both `.is-disabled` and `aria-disabled="true"`. Do **not** use native `disabled` on individual menu options: they must remain present to accessibility APIs and available for pointer-hover explanation, while a central selection guard rejects pointer, Enter, and Space.
- Disabled options use `tabIndex=-1` and are skipped by Arrow Up/Down, Home, End, and typeahead/roving focus. This supersedes plan language that makes disabled rows keyboard-focusable. A `title` may support pointer users, but title alone is not the accessible explanation.
- The listbox/menu receives an `aria-describedby` summary such as `Panel 2 has 2 seconds available after earlier and locked panels.` Disabled rows retain concise `aria-label`/description text naming the value and reason. This makes the limit discoverable without forcing keyboard users through unavailable choices.
- Focus contract: Enter, Space, or Arrow Down opens from the trigger; opening focuses the selected enabled option. If the current value is `0s` or otherwise disabled, focus the first enabled option; if none exists, keep focus on the trigger while the menu remains open. Escape closes and returns focus to the trigger. Tab closes and advances normally. Enter/Space can select only an enabled option.
- Visible focus uses the existing Prism focus color: trigger `outline: 2px solid #b89cff; outline-offset: 2px`; menu option uses the same 2px indicator inset so the scroll container cannot clip it. The measured focus color contrast is `7.74:1` on `#1a181e`.

### 4. Exhausted `0s` presentation

- The duration trigger remains a focusable menu opener, because users must still inspect the positive choices. It keeps the same 28px pill geometry, downward chevron, neutral `var(--node-control-bg)` and `var(--node-control-border)`, and pointer cursor.
- Add `.is-exhausted` to the duration select and `.is-system` to the synthetic `0s` option. Render `0s` in `#8e8999` at **8px / 400**. Keep the chevron visible but subordinate; do not remove it or make the trigger look like a dead control.
- Do not use rose/red, an error border, warning fill, strikethrough, an `Auto` label, or a disabled trigger. The neutral value plus persistent helper communicates a system exhaustion state rather than an authored selection or field-validation error.
- Trigger accessible name: `Panel N duration, 0 seconds, no sequence time remains.` Trigger description/title: `No sequence time remains. Reduce an earlier panel or increase Storyboard Duration.`
- The open menu places one synthetic selected `0s` row before the positive lattice. It is `aria-selected="true"`, `aria-disabled="true"`, `.is-system.is-disabled`, `tabIndex=-1`, visually neutral, and never invokes `onChange`. It must not receive the ordinary bright selected fill.

### 5. Persistent helper and errors

- When any unlocked panel is `0s`, render one derived, non-persisted helper **between the scrollable panel grid and the footer**. This keeps the reason adjacent to the timing summary without changing panel heights or repeating copy per panel.
- Copy for the first zero: `Panel N has 0s. Reduce an earlier panel or increase Duration.` For multiple zero panels, append `N more panels have 0s.` only if it fits without becoming debug-like; otherwise keep the first-zero copy.
- Helper typography: **8px / 400**, maximum two lines, `#9a92a3` on the existing node/input surface; measured contrast is `6.33:1` on `#111015`. Use `role="status"` and `aria-live="polite"`. This is guidance, not a red field error.
- An impossible locked reservation is a blocking conflict and may use the existing `.storyboard-status.is-error` treatment (`#e18a9c`); the measured contrast is `7.13:1` on `#17161b`. Copy: `Locked Storyboard panel N exceeds the available duration. Unlock it, increase Storyboard Duration, or choose a compatible model.`
- Derive budget helper/conflict presentation from reconciliation on every render/reopen. Do not persist ordinary zero-state copy into the generic `data.error` field or overwrite Revamp/provider, model-panel-limit, or connection errors. Downstream readiness retains the exact first-zero blocking error from the plan.

### 6. Locked-panel clarity

- Preserve the current dashed locked-panel border and visible closed Lock action. Do not add a second opacity reduction to duration text/options.
- A locked duration trigger remains non-editable and reads `Locked at Ns. Unlock panel to change duration.` through its wrapper tooltip/description. Locked positive durations reserve budget before earlier unlocked choices are enabled.
- A locked `0s` panel does not auto-recover. It must read `Locked at 0s. Unlock this panel to let available time recover.` and remains a downstream blocker until unlocked or deleted. This case requires explicit plan coverage.
- Preserve current explicit delete behavior for a locked panel unless product ownership separately changes it. Deleting that panel removes its reservation and immediately reconciles the remaining panels; deletion must not silently unlock or mutate the panel first.

### 7. Model, mode, mutation, and persistence behavior

- Preserve exact numeric model target options when present. When a model exposes no numeric duration values, preserve the current deterministic target-selector fallback **`[5s, 10s, 15s]`** and per-panel maximum `15s`; the existing plan defines the maximum but not the visible fallback set.
- Target/model/mode changes, duration changes, lock/unlock, add, and delete all pass through the same pure reconciler before persistence.
- Model/target shrink clamps only unlocked values; model/target growth recovers unlocked zeros left to right to `1s` and leaves positive values unchanged.
- Single → Separate retains positive values, recovers unlocked zeros to `1s`, and applies only model maximums. Separate → Single immediately applies aggregate ordering and locked reservations.
- Add appends `1s` only if available after locked reservations; otherwise `0s`. Delete frees its duration and recovers the earliest eligible zero.
- Migration reads legacy `auto`, writes only numeric values, remains idempotent, preserves panel order/prompts/locks, and reproduces the same `0s` state and helper after save/reopen.

## Ranked findings

### Critical

- None.

### Major

1. **[Risk · high confidence] Disabled-option focus policy is not accessible enough as planned.**
   - **Evidence:** plan lines 101–103, 367, 579, and 586 make disabled options focusable, but only provide `title`/reason text; active `StoryboardCompactSelect` has no keyboard model (`UtilityNodes.tsx:256–320`).
   - **User impact:** keyboard users can be forced through many unavailable values, while screen-reader users may still not receive the title reason consistently.
   - **Exact recommendation:** amend Tasks 6/8 and the acceptance matrix to use `aria-disabled`, `tabIndex=-1`, skip disabled rows in roving focus, keep all rows visible, centrally guard selection, and put the remaining-budget explanation on the listbox/trigger with `aria-describedby`.

2. **[Defect in plan contract · high confidence] The required 8px/10px compact hierarchy is not specified.**
   - **Evidence:** governing visual standard lines 19 and 32 require 8px closed compact values and option rows exactly 2px larger. Active CSS currently drives option rows from the 8px trigger value (`styles-next.css:1744–1767`). Plan Task 8 only says not to change unrelated typography.
   - **User impact:** Developer must guess whether new duration rows stay too small or expand every Storyboard menu.
   - **Exact recommendation:** scope duration triggers to 8px/400 and duration menu rows to 10px/400; do not broaden typography changes beyond duration selectors in this implementation.

3. **[Risk · high confidence] The plan lacks a persistent node-local `0s` explanation and risks overloading generic error state.**
   - **Evidence:** plan lines 97–103 specify trigger/title/menu state; lines 114–125 specify downstream error; Task 7 line 420 routes conflicts to existing Storyboard error/status. Active UI renders only `data.progress || data.error` after the footer (`UtilityNodes.tsx:444–450`).
   - **User impact:** the blocking state can be easy to miss in a dense 315px node, or a derived budget conflict can overwrite unrelated provider/model errors.
   - **Exact recommendation:** add the derived neutral helper above the footer for zero states; reserve rose `.is-error` for impossible locked conflicts; keep budget presentation separate from persisted generic errors.

4. **[Risk · high confidence] Locked `0s` recovery is semantically undefined.**
   - **Evidence:** plan lines 78, 84–95 preserve locked values and recover exhausted unlocked values, but the acceptance matrix does not cover locking an already exhausted panel.
   - **User impact:** a workflow can remain blocked after budget increases with no clear reason or recovery instruction.
   - **Exact recommendation:** state and test that locked `0s` remains `0s`, shows lock-specific copy, and recovers only after unlock/delete; preserve locked positive reservations unchanged.

5. **[Defect in plan contract · high confidence] No-duration model fallback is visually ambiguous.**
   - **Evidence:** plan lines 47–50 define exact model target options and a `15` maximum fallback but do not define the target selector options when the numeric set is empty. Active renderer uses `[5,10,15]` (`UtilityNodes.tsx:407`).
   - **User impact:** Developer must invent a visible selector state, risking disappearance of Duration or behavior drift after model changes/reopen.
   - **Exact recommendation:** explicitly retain `[5s, 10s, 15s]` as the target-selector fallback and `15s` as the per-panel maximum.

### Minor

1. **[Risk · medium confidence] Disabled and exhausted styling is under-specified.**
   - **Evidence:** plan lines 440–446 permit either not-allowed or neutral cursor and provide no foreground, opacity, selected-row, or focus-ring values.
   - **User impact:** compact disabled text may become unreadable, while `0s` may resemble an error or normal selected value.
   - **Exact recommendation:** adopt the concrete colors, no-opacity rule, cursors, focus indicator, and `.is-system` behavior in this review.

2. **[Risk · medium confidence] Manual menu geometry coverage is too general.**
   - **Evidence:** plan line 592 leaves visual dropdown greying/focus/ergonomics to user acceptance but does not name edge positions, 315px containment, the 440px app width, or practical zoom states.
   - **User impact:** an anchored portal regression can pass source tests while clipping or detaching in the actual canvas.
   - **Exact recommendation:** add the user-owned manual checks below to the package handoff.

### Taste

- None. No restyle, anti-template treatment, decorative warning badge, new icon, animation, or design-system conversion is recommended.

## Required plan amendments before implementation

1. Replace “disabled options remain focusable” with the roving-focus exclusion and accessible-description contract in this review.
2. Specify 8px/400 duration triggers, 10px/400 duration option rows, full-opacity disabled color `#8e8999`, no disabled hover fill, and the existing `#b89cff` focus indicator.
3. Add the derived zero-duration helper above the footer and prevent budget state from overwriting unrelated persisted `data.error` content.
4. Add locked-`0s` behavior/copy/tests and state the current explicit locked-panel deletion reconciliation behavior.
5. Define the no-numeric-duration target-selector fallback as `[5s, 10s, 15s]` with per-panel maximum `15s`.
6. Expand acceptance/manual coverage for all-disabled menus, focus return, viewport edges, 315px width, 440px app width, practical canvas zoom, lock conflicts, and save/reopen.

## Acceptance matrix

| Scenario | Required visual/interaction result | Automation evidence Developer returns | User-owned manual check |
|---|---|---|---|
| Single `5s`, panels `[3,3]` | Persist `[3,2]`; Panel 2 shows `1–5`; `3–5` grey, full-opacity, unavailable | Reconciler and renderer behavior tests | Open Panel 2 at 315px; verify rows, no width jump, no selection by pointer/Enter/Space |
| Single `5s`, panels `[5,2]` | Persist `[5,0]`; neutral `0s` trigger; synthetic `0s`; all positive rows disabled; helper above footer | Renderer, persistence, resolver, and provider-boundary tests | Confirm `0s` is not red, not Auto, menu opens, helper is readable, scrollbar only if needed |
| All options disabled | Focus remains on trigger; description announces no remaining time; arrows do not enter disabled rows; Escape/Tab behave normally | Focus/keyboard component test | Keyboard-only open/close at 1× and zoomed canvas |
| Three panels `[3,1,1]`; first → `4`/`5` | `[4,1,0]` then `[5,0,0]`; first-zero helper updates without layout jitter | Reconciler/renderer tests | Observe immediate left-to-right state and stable panel/footer geometry |
| Target grows `5→7` | `[5,1,1]`; zeros recover left to right; no old values restored | Reconciler + persistence tests | Verify enabled styling and helper removal |
| Target/model shrinks | Unlocked clamp; locked values persist; ceilings and helper/conflict update atomically | Reconciler/model tests | Inspect no transient impossible selection or stale menu |
| No numeric model durations | Target menu `[5,10,15]`; independent max `15` | Normalization/renderer test | Verify labels and reopen consistency |
| Locked downstream `3s` at target `5s` | Earlier unlocked max `2s`; locked trigger reads `Locked at 3s` | Reservation tests | Inspect dashed lock state, legible trigger, and tooltip/description |
| Lock an exhausted `0s` panel | Remains `0s`; lock-specific helper; target growth does not recover it until unlock/delete | New locked-zero test | Verify copy and recovery after unlock |
| Delete locked or unlocked panel | Remove exactly that panel/reservation; reconcile remaining panels immediately | Add/delete reconciliation test | Confirm no stale helper/ceiling and no silent unlock step |
| Single ↔ Separate | Separate removes aggregate disabling and recovers unlocked zeros; return to Single reapplies ordering | Mode-switch tests | Verify Duration topbar visibility/geometry and menu behavior |
| Save/reopen/migration | Numeric `0` and locks persist; no Auto; same helper/menu/readiness after reopen | Migration idempotence and persistence tests | Reopen exact workflow and inspect first zero/lock state |
| Downstream generation with zero | First zero blocks with exact actionable copy; all panels/prompts remain | Resolver and shot compiler tests | Inspect Video Generator readiness tooltip only; do not run provider |
| Menu near viewport edges | Portal remains anchored, width fits labels, genuine overflow scrolls, no clipping | Source/layout guard only | Test left/right/top/bottom canvas positions, ordinary scroll, 440px app width, 315px node, practical zoom including zoomed-out and zoomed-in states |
| Focus visibility | Trigger and enabled option show unambiguous violet 2px indicator; disabled rows never masquerade as focus | CSS/component assertions | Keyboard inspect in default, exhausted, and locked states |

## Tested/read evidence

- Read the complete ordered-duration-budget plan, including its implementation tasks, acceptance matrix, and risk decisions.
- Read the governing visual/interaction standard, selector doctrine, Storyboard node contract, Prism product standard, and Designer Prism context.
- Read active next-generation `UtilityNodes.tsx` and relevant `styles-next.css` evidence only.
- Confirmed no `components.json` exists in the canonical Prism root.
- Measured contrast for the source-grounded color pairs named above.
- Verified the report target was absent and reserved under the Design Inspector provenance guard before creation.

## Untested / blocked gaps

- No rendered UI, screenshot, DOM/AX tree, keyboard traversal, screen-reader announcement, canvas zoom, viewport-edge anchoring, 440px window, persistence/reopen, build, package, or provider behavior was exercised by Designer.
- Source inspection cannot prove painted balance, clipping, tooltip reachability, actual focus movement, or assistive-technology output.
- Developer must return one stable implementation candidate and focused automated evidence. The user owns the manual Flight Tester checks in the acceptance matrix.

## Final verdict

**BLOCKED**

The ordered-budget semantics, left-to-right reconciliation, locked reservation model, Separate Shots independence, numeric `0s` persistence, migration direction, and dual downstream safety guard are approved in principle. Developer implementation must not begin from the current plan until the six required amendments above are incorporated into the implementation contract. The blockers are exact and bounded: disabled-option keyboard/accessibility behavior, 8px/10px typography, persistent zero-state explanation/error separation, locked-`0s` recovery semantics, no-duration model fallback, and explicit manual geometry/focus coverage.

## Developer handoff

- **Apply:** required amendments 1–6.
- **Preserve:** 315px node; existing 4/5/7/8px spacing rhythm; flat dark Prism palette; 8px compact triggers; existing Storyboard hierarchy; all panels/prompts/locks; Separate Shots independence; no Auto; no hidden desired-duration field; no shadcn dependency or conversion.
- **Return for re-review:** the frozen amended plan/contract or one stable implementation candidate, limited to Storyboard duration selectors, zero/helper/conflict states, locked duration states, footer adjacency, and relevant menu focus/viewport behavior.

---

# Post-code stable snapshot review

## Scope, routing, and snapshot gate

- **Scope:** one bounded read-only pre-build audit. Designer changed no source, test, plan, canonical document, skill, package, output, candidate, profile, memory, or external workspace. Only this Designer-owned review was appended.
- **Stable snapshot:** `/tmp/prism-storyboard-duration-prebuild-snapshot.json`, titled `Prism Storyboard ordered duration pre-build`.
- **Hash gate:** **PASS**. All 16 manifest entries returned `OK` from `shasum -a 256 -c`; the reviewed files match the manifest exactly. This is not a moving snapshot.
- **Automated evidence supplied by Developer:** focused tests `6/6` files and `226/226` tests pass; TypeScript passes; build/package/open were correctly not run at the pre-build stop boundary.
- **Specialist routing:** Designer Supervision governed the stable-snapshot/non-competing boundary; Iris governed protected existing-product inspection; Hallmark supplied the read-only interaction, accessibility, hierarchy, responsiveness, and design-system audit. Taste and shadcn were not applied: this remains established dense Prism product UI, and no shadcn trigger or conversion authority exists.
- **Implementation owner:** Developer remains the sole source/integration writer. Designer reviewed only manifest-listed changed files and directly necessary existing Storyboard tokens/status rules. Legacy `App.tsx` and `styles.css` were not inspected.

## Consolidated findings

### Critical

- None.

### Major

#### PC-01 — All-disabled and continuously anchored menus do not preserve the required focus lifecycle

- **Priority/type/confidence:** P1 · defect/risk · high.
- **Axis:** keyboard accessibility, focus management, viewport anchoring.
- **Evidence:** `UtilityNodes.tsx:327–331` handles only Enter, Space, and Arrow Down on the trigger. In the all-disabled state, `UtilityNodes.tsx:305–311` correctly returns focus to that trigger, but Escape and Tab are implemented only on the portalled menu at `332–339`; those events therefore never reach the menu handler. Escape leaves the all-disabled menu open, and Tab can move away without executing the required close path. Separately, `UtilityNodes.tsx:369–375` re-runs `focusEnabledOption(...)` whenever `menuPosition` changes; continuous anchoring during pan, zoom, node movement, resize, or scroll can steal focus back to the selected/first option after the user has arrowed elsewhere.
- **Contract impact:** fails prior amendment 1 and the explicit all-options-disabled, focus-return, viewport/zoom contract. The source-string assertions in `productSurface.test.ts:806–819` do not exercise either event route.
- **User impact:** keyboard users can leave a detached menu open or lose their current option while the anchored portal follows the canvas.
- **Required change:** when the open menu retains focus on the trigger, handle Escape there by closing and retaining/restoring trigger focus, and handle Tab there by closing without trapping normal traversal. Separate initial-open focus from continuous position updates so `menuPosition` changes never reset an already valid focused enabled option. Add behavioral component tests for all-disabled Escape/Tab and for preserving the actively roved option across an anchor-position update.

#### PC-02 — The two-line helper box is one CSS pixel too short for its declared line box

- **Priority/type/confidence:** P1 · defect · high.
- **Axis:** compact typography, clipping, grid/helper/footer rhythm.
- **Evidence:** global `box-sizing: border-box` applies. `styles-next.css:1779` sets the helper to `max-height: 28px`, `padding: 4px 9px`, a 1px top border, 8px text, and `line-height: 1.25` (10px). Two lines require 20px of content plus 8px vertical padding plus 1px border = 29px, while overflow is hidden. The long locked-conflict copy is the state most likely to use both lines.
- **Contract impact:** fails the accepted “at most two readable lines” helper contract and the locked-conflict clarity requirement.
- **User impact:** the lowest pixel row/descenders of a wrapped conflict can be clipped at the canonical 315px node width, weakening the exact recovery instruction.
- **Required change:** give the helper a content-safe two-line maximum (at least 29px under the current 8px/1.25/padding/border geometry, or an equivalent calculated two-line block) while preserving its position directly between grid and footer. Add a focused layout/style assertion for the complete two-line box arithmetic; rendered confirmation remains manual.

### Minor

- None beyond the two blocking contract failures above.

### Taste

- None. No redesign, new visual language, decorative alert treatment, animation, dependency, or component-system conversion is requested.

## Accepted criteria

- **Ordered budget semantics:** accepted from the pure implementation/tests. Target `5s` with `[3,3]` reconciles to `[3,2]`; `[5,2]` reconciles to `[5,0]`; positive unavailable options remain represented. Three-plus-panel edits, target growth, add/delete, left-to-right zero recovery, and positive non-expansion are covered.
- **Locked behavior:** accepted. Downstream positive locks reserve time; impossible positive locks are preserved and conflict; locked `0s` remains exhausted until explicit unlock/delete. The renderer routes duration, lock/unlock, add/delete, target, model, and mode mutations through the shared reconciliation wrapper.
- **Separate Shots and fallback:** accepted. Separate Shots has independent model ceilings; the no-numeric fallback is `[5,10,15]` with per-panel maximum `15`.
- **No hidden state / persistence:** accepted from source and focused tests. Legacy Auto normalizes numerically; numeric `0`, prompts, order, and locks survive migration/reopen; no desired-duration field is introduced.
- **Visible disabled/system options:** accepted except for PC-01’s lifecycle defects. Options carry `.is-disabled`, `aria-disabled`, `tabIndex=-1`, concise reasons, a central selection guard, enabled-only arrows/Home/End/typeahead, and an `aria-describedby` summary. The synthetic selected `0s` row is neutral, system-marked, disabled, and unselectable.
- **Visual token contract:** accepted statically. Duration triggers are 8px/400; duration rows 10px/400; disabled text is full-opacity `#8e8999` without hover/selected fill; focus is 2px `#b89cff`; the exhausted trigger retains neutral existing surfaces; compact controls remain 28px and the Storyboard product node remains governed by the 315px wrapper.
- **Helper/error separation:** accepted except for PC-02’s clipping. One derived helper is placed exactly between panel grid and footer, uses neutral 8px/400 styling for exhaustion, uses the existing error color only for locked conflict, and is not persisted into or substituted for `data.error`.
- **Downstream safety:** accepted. `workflowResolver.ts:62–68` rejects zero before mapping provider-facing shots. `shotSpec.ts:124–138` rejects zero from both `storyboardShots` and `multiPrompt` before grouping/timecodes. Tests preserve source panel/prompt order and prove no drop/rewrite.
- **Existing Storyboard status regression:** accepted statically. The existing `storyboard-status` remains after the footer at 8px/400, `line-height: 1.25`, and `3px 8px` padding; `Revamping N panel(s)` and the exact failure copy remain intact. The ellipsis remains a bounded inline pseudo-element with reduced-motion final width. Because the status row is a full-width block and the ellipsis is terminal content, its internal width animation has no following text or sibling whose position can shift; rendered confirmation is still required.
- **Spacing/dead-band decision:** the duration helper **prevents**, rather than creates, a semantic dead band by placing the budget explanation directly between the panel grid and timing footer. It does not replace or merge with the running/error status, which remains below the footer. If helper and Revamp status coexist, the footer separates two purposeful state rows; source geometry introduces no empty spacer. PC-02 is a clipping defect, not a dead-band defect.

## Automated evidence adequacy

- The pure budget, migration/reopen, resolver rejection, provider-boundary rejection, and TypeScript evidence are adequate for build entry after the blocking findings are corrected.
- The renderer `productSurface.test.ts` coverage is mostly source/CSS string assertion. It proves required declarations are present but does not prove real focus movement, portal close behavior, accessible announcements, wrapping, clipping, anchor-follow behavior, or painted balance. PC-01 demonstrates a route the current static tests report as passing but the source logic does not satisfy.
- After PC-01 and PC-02, Developer should rerun the affected focused tests plus TypeScript, then build once. Do not broaden into provider or package actions until the existing pipeline authorizes them.

## Unverified / user-owned manual checks

- Pointer and keyboard selection at `[3,2]`, `[5,0]`, all-disabled, locked-positive, locked-`0s`, conflict, target/model change, add/delete, and Single/Separate transitions.
- Trigger/menu accessible name and description announcements; Escape focus return; Tab continuation; enabled-only arrow/Home/End/typeahead; no focus theft while panning, zooming, moving the node, resizing, or scrolling.
- Actual 8px/10px rendering, muted disabled readability, neutral `0s`, 2px focus visibility, chevron clarity, menu scrollbar, and pointer-hover reason.
- 315px node at ordinary and representative zooms, viewport edges, and 440px application width; no detached/clipped menu or horizontal overflow.
- One-line zero helper and longest two-line locked conflict after PC-02; no clipping, no large dead band, and balanced grid/helper/footer borders.
- Helper alone, `Revamping N panel(s)` alone, error alone, and helper plus running/error status together: no wrap-induced height jump, no footer crowding, no ellipsis-driven visible layout shift, and stable reduced-motion presentation.
- Save/reopen of unlocked zero and locked zero in the actual app, with no Auto reappearance and the same helper/readiness state.
- Video Generator readiness tooltip shows the exact first-zero block without invoking a provider.

## Final verdict

**BLOCKED**

The stable snapshot is valid and the duration-budget/data/downstream implementation is substantially accepted, but it is not approved for build until **PC-01** and **PC-02** are corrected and covered by the focused evidence described above.

## Developer handoff

- **Apply:** PC-01 and PC-02 only, in one bounded integration batch.
- **Preserve:** all accepted budget semantics, fallback, migration, zero rejection, tokens, helper/status separation, 315px geometry, and existing Revamp status behavior.
- **Re-review target:** exact remediated selector focus lifecycle and helper two-line geometry, plus directly affected tests; no unrelated redesign or source expansion.

---

# Final stable snapshot re-review

## Stable gate and bounded scope

- **Stable snapshot:** `/tmp/prism-storyboard-duration-revampall-prebuild-snapshot.json` (`Prism Storyboard duration + coherent Revamp All pre-build`).
- **Hash gate:** **PASS**. All **20/20** manifest-listed files matched their declared SHA-256 values before review; no moving-target mismatch was found.
- **Scope:** one final read-only source/evidence audit of manifest-listed changed files and directly necessary existing Storyboard tokens. Legacy `App.tsx` and `styles.css` were not inspected. No build, test, UI, provider, source, plan, canonical doc, skill, profile, Obsidian, or package action was performed. This existing Designer report is the only duration artifact changed.
- **Routing:** Designer Supervision + Iris / Design Inspector + Hallmark Audit, against the established Prism system. Taste and shadcn were not triggered.

## Consolidated final finding batch — duration resolution

### PC-01 — All-disabled Escape/Tab lifecycle remains incomplete

- **Priority/type/confidence:** **P1 · defect · high**.
- **Axis:** keyboard lifecycle, focus stability, continuous anchoring.
- **Evidence:** `UtilityNodes.tsx:328–332` still handles only Enter, Space, and Arrow Down on the trigger. In the all-disabled state `focusEnabledOption` returns focus to that trigger (`306–312`), while Escape and Tab close behavior exists only on the portalled menu handler (`333–340`). With focus on the trigger, Escape therefore does not close and Tab advances without executing the required explicit close path. The anchoring regression itself is corrected: the focus effect now distinguishes initial open with `wasOpen` and no longer depends on `menuPosition` (`369–379`), so continuous anchor updates do not reset a valid roved option. Disabled rows remain excluded by enabled-only querying and `tabIndex=-1` (`306`, `341–366`, `387`).
- **Contract impact:** the no-focus-theft half of PC-01 passes, but the required all-disabled Escape/Tab lifecycle and explicit Escape focus-return criterion still fail.
- **Automated evidence strength:** **weak for behavior**. `productSurface.test.ts:806–825` is source-string coverage; it finds Escape/Tab text anywhere in the component but does not prove those keys are handled on the focused trigger in the all-disabled branch. It would pass the observed routing defect.
- **Direction:** Developer should route Escape and Tab through the focused trigger while an all-disabled menu is open: Escape closes and retains/restores trigger focus; Tab closes without trapping normal traversal. Add a behavioral component test that opens an all-disabled menu, asserts trigger focus, sends Escape and Tab separately, and observes `aria-expanded`, focus return/continuation, and zero disabled-row focus.

### PC-02 — Resolved

- **Priority/type/confidence:** **pass · high confidence from static arithmetic**.
- **Evidence:** `styles-next.css:1779` now declares `min-height: 29px; max-height: 29px; padding: 4px 9px; border-top: 1px`; at 8px text and `line-height: 1.25`, two 10px line boxes + 8px vertical padding + 1px border equal 29px under border-box sizing. `productSurface.test.ts:840–852` asserts the 29px geometry and typography.
- **Contract impact:** PC-02 is closed. Source geometry is content-safe for two declared lines; painted descender/clipping confirmation remains manual.

## Preserved duration and status contract

- Static evidence preserves the 8px/400 trigger and helper hierarchy, 10px/400 duration rows, full-opacity muted disabled styling, neutral system `0s`, 2px violet focus treatment, helper placement between grid and footer, locked/conflict semantics, `[5,10,15]` fallback, and the canonical 315px node geometry (`UtilityNodes.tsx:404–559`; `styles-next.css:1710–1797`).
- The duration helper is ordered grid → helper → footer, while Revamp running/error status remains after the footer. At source level this creates two purposeful separated state rows rather than an empty band. Running/error status retains 3px/8px padding, one top border, 8px/400 at 1.25 line-height, terminal bounded ellipsis, and reduced-motion final ellipsis (`styles-next.css:1793–1797`). No new source-level footer/status regression was found.
- Painted wrapping, border balance, and visible ellipsis stability were not approved because UI inspection was explicitly out of scope.

## Final verdict

**BLOCKED — PC-01**

PC-02 is resolved and the prior visual/interaction contract is statically preserved, but the duration lane is not approved for build while the all-disabled trigger Escape/Tab lifecycle remains incomplete. The combined snapshot also carries **RA-01**, detailed in the Revamp All report.

## User-owned manual checks

- All-disabled keyboard flow: trigger retains focus on open; Escape closes and returns/retains focus; Tab closes and advances normally; disabled rows never receive focus.
- No focus theft while panning, zooming, moving the node, resizing, or scrolling with an enabled option roved.
- One-line exhaustion helper and longest two-line locked conflict at 315px, representative zooms, viewport edges, and 440px app width: no clipping, dead band, horizontal overflow, or border crowding.
- Actual 8px/10px readability, disabled/system `0s` contrast, focus indicator, chevron, pointer reason, and genuine-overflow scrollbar.
- Helper alone, running/error alone, and helper plus running/error: stable row order/height, no visible ellipsis shift, and stable reduced-motion final ellipsis.

---

# Final blocker resolution

- **Stable snapshot:** `/tmp/prism-storyboard-duration-revampall-prebuild-snapshot-v3.json` (`Prism Storyboard duration + coherent Revamp All pre-build v3 — PC-01 and RA-01 repaired`).
- **Hash gate:** **PASS**. All **22/22** manifest-listed SHA-256 values matched before review.
- **Bounded scope:** PC-01 only, using the manifest-listed helper/test, active selector wiring, and directly affected static renderer evidence. No tests, build, package, UI, provider, source, canonical docs, skills, profile, or Obsidian actions were performed.

## PC-01 — Resolved

- **Executable behavior:** `storyboardTriggerMenuKeyAction` is a pure helper with Vitest coverage for open-menu Escape (`close`, `preventDefault`, trigger-focus intent), open-menu Tab (`close` without `preventDefault`), initial Enter/Space/ArrowDown opening, and unrelated-key no-op behavior.
- **Active wiring:** `StoryboardCompactSelect` invokes the helper from the trigger key handler and applies close/open, default-prevention, and trigger-focus results. With no enabled option, initial-open focus falls back to the trigger; disabled rows are excluded from enabled-button queries and remain `tabIndex=-1`.
- **Roved-focus stability:** initial focus is gated by `menuWasJustOpened`; continuous `menuPosition` updates are absent from the effect dependencies and therefore do not reset a valid enabled roved option.
- **Contract impact:** the final PC-01 blocker is closed. PC-02 and the accepted duration/status contract remain unchanged.

## Verdict

**PC-01 APPROVED FOR BUILD.**

## Remaining user-owned manual checks

- All-disabled open: trigger retains focus; Escape closes and retains/restores focus; Tab closes and traverses forward; no disabled row receives focus.
- With an enabled option roved, pan, zoom, move, resize, and scroll without focus theft.
- Retain the prior painted checks for menu anchoring, 315px/440px containment, helper clipping, compact typography, and status/helper rhythm.
