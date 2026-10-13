# Node Footer Hard Contract

Status: Required user contract, 13 October 2026. Applies to every node footer, including future node families. This contract supersedes earlier conflicting footer row preferences, visible field headers, action placement and footer spacing rules. It does not redefine node bodies, inspectors or Storyboard panel controls.

## Invariants

1. When a model control exists, it is first at the left or top-left even if another field is longer. Without a model, the longest available selector is first at the left or top-left.
2. Generation/Run/Revamp is rightmost on the only row or bottom row. Settings, when available, sits immediately to its left. Other circular icon actions form a contiguous group to the left of Settings. An optional icon that cannot fit wraps to a row above and remains right-aligned. Do not separate icons with Quantity or another field.
3. Other fields, including Quantity, have no assigned row or pairing. Use measured available space and actual control content to relieve cramped fields across the whole footer. Do not force rows merely to balance control counts.
4. Footer fields have no visible field headers. Recognizable selected values explain themselves. Ambiguous unset fields display their field name or a prompt such as Select voice. Preserve accessible names, authored selections and provider validation; a placeholder is not a fabricated selection.
5. Circular buttons align vertically with the painted input/selector frame, excluding any field-header area. Keep circle sizes and existing icon geometry unchanged.
6. General padding owns all four outer edges, from the footer boundary to its outermost painted controls: current --node-footer-inset aliases --node-body-inset (12px). The smaller control-group gap owns every internal horizontal and vertical gap between fields, rows, and fields/circular buttons (7px). Do not substitute inner selector text padding for either spacing role.
7. Arrange row membership before distributing spare width. Measure real selected text, leading marks, fixed chevrons, borders and minimum content padding. Share residual row width equally among flexible field/selector tracks so their selected-text-to-chevron clearance agrees. Do not enlarge gaps, circular actions or leading identity marks to absorb spare space.
8. Apply the same contract across all current node families and any future footer. Preserve unrelated state, menus, focus, authored values, callbacks and asynchronous availability. Tests must cover long selections, added/removed fields, hidden controls, resize, icon overflow, one-row and multi-row layouts, visible padding and painted alignment.

## Ownership and verification

Pure row policy: work/src/shared/footerControlLayout.ts. Actual renderer adapter: FluidControlGroup exported by work/src/renderer/src/NodeCardNext.tsx, with a footer-specific shared wrapper. Generic inspector and Storyboard panel groups keep their own scope. NodeCardNext, UtilityNodes and other current footer owners must consume the footer policy; a parallel preview or unused duplicate component is insufficient.

Acceptance requires actual component renders at wide/narrow widths and transformed canvas scale, meaningful pure regressions, TypeScript and current node-family coverage. Green bounding checks alone are insufficient. No installed or live-provider success is inferred from preview evidence.


Music verification correction — 13 October 2026: field-height verification must inspect the actual painted input/selector/quantity frame and circular buttons, not only the allocated row or wrapper. Music duration initially painted12px inside a28px row because its bare input class lacked the complete shared voice-primary-controls height owner. The accepted owner now supplies28px without a custom height. Approved Music uses12px outer insets,7px peer gaps, model first, terminal Settings/Run, headerless footer controls, and existing multiline/section field anatomy. Sample whitespace-regression text is test data and must not serve as a presentation/design preview.


## Selected-content pressure correction — 13 October 2026

Footer editable fields measure the exact visible authored value (or empty-field placeholder), plus existing input/wrapper chrome and the consumer minimum floor; browser default input capacity must not determine the row requirement. Measured editable fields join selectors in the reference-sized residual allocation, so leftover width is shared equally. The footer opts into pressure ranking of movable fields by measured content width after minimizing row count; Model remains anchored first and the circular action suffix remains constrained. Other body/Inspector allocation remains unchanged. Source owners: NodeCardNext.tsx, controlGroupLayout.ts and footerControlLayout.ts. Bounded evidence:70 focused tests,90 Music painted states including long-duration typing/restore,168 observations across28 established footer variants; no provider submissions. Package/installed checkpoint is recorded separately in CURRENT-STATE.md.


## Music duration presentation — 14 October 2026

Footer durations reuse the existing duration selector and shared one-decimal seconds label, including the s suffix. Presentation rounding must not modify authored precision: saved3.125 displays3.1s while retaining3125ms for the request. Explicit selection alone changes the saved value. Do not substitute a generic number input or custom field design. Automatic row allocation measures the selected label and keeps the shared model/action/spacing contract.


## Existing duration choices — 14 October 2026

Reuse the existing duration option generator, not only its selector appearance or formatter. Standard choices start1.0s, step0.5s and retain one decimal plus s. Music uses normalizedStoryboardDurationOptions with its existing600-second maximum. Preserve saved off-grid precision explicitly until user selection; keep provider validation independent from visual choice generation. Sparse invented presets are superseded.


## Duration family ownership — 14 October 2026

Active node footer and Inspector callers must share their duration inventory. Sound Effects preserves its explicit legal0.5s exception and provider caps. Native continuous number schemas may use the existing half-second sampler only when the endpoint/current timing descriptor verifies seconds; filter every offered value through provider validation and retain valid exact saved/default fractions. Do not infer seconds from a field name alone. Provider enums, integer/multipleOf rules, frame/source timing, unknown or unbounded units and raw Music plan drafts retain their existing domain contracts. Rendering must never rewrite authored precision.
