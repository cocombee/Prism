# Selector and Discrete-Control Doctrine

> **Status:** Required contract baseline — confirm against renderer source, shared selector implementation, CSS, and packaged Flight Tester QA.
> **Source:** Pre-branch `SKILL.md:198-203`, preserved verbatim below.

## Protected selector behavior

Selector equalization is a painted-pixel calculation. For each exact model/capability state, the closed trigger's intrinsic track is established from that model's default selected value in the browser's actual rendered font, including any leading company mark, painted text, chevron, internal gaps, padding, and borders. Never substitute character count, nominal advance width, the longest legal option, a stretched grid-label box, or a prior allocated track. Longest-legal sizing belongs only to the independently sized open menu.

A later longer selection never enlarges the established closed track; it truncates with `…`. Capability or visible-value changes recalculate group placement, while the selector's intrinsic cap remains its model-default track. After placement, selectors in one row receive the same painted distance from the selected text's final visible glyph to the chevron; a leading logo is excluded from that measurement, and different rows may use different distances.

Selector-row arithmetic uses one coordinate system. When the canvas is zoomed or transformed, divide rendered fixed-control rectangles by the live row scale before combining them with CSS-font glyph measurements and unscaled `clientWidth`; never mix transformed screen pixels with CSS pixels. Gap normalization is scoped to one logical 2–3-row control group: every horizontal and vertical neighboring control inside that group uses one gap, separate upper/middle/bottom groups calculate independently, and existing inter-group spacing remains unchanged.

For bounded discrete on-node values such as Voiceover Speed and Fish Audio Volume, use the shared application selector with one downward chevron instead of the browser's up/down number spinner. Show multipliers with the multiplication sign, such as `1.2×`. This supersedes the earlier Voiceover native-spinner presentation requirement while preserving the same legal provider values.

## Selected identity alignment

Closed selected-value triggers keep their content at the caller's established left inset: ordinarily `--selector-content-inset` (8px), with retained 7px Storyboard and 10px Inspector caller insets. The icon-to-name relationship uses Prism's predominant existing 7px spacing, owned by `--selector-icon-label-gap`; Audyt supplied the alignment method, not a replacement numeric scale.

The selected leading identity mark is intrinsic and never receives the name field's flex growth or a sibling's surplus space. Crop only the SVG viewport or remove font side bearings to establish its actual painted width, preserving original company artwork and the accepted 12px icon envelope. A shared-row allocation may enlarge the field frame; surplus width stays after the left-aligned name before the fixed right chevron. Do not center the selected icon/name cluster or add symmetric extra left padding.

This rule concerns the closed selected trigger. Popup list rows keep their existing layout. Preserve model-default track calculation, row membership, bounded Quantity symmetry, terminal actions, focus, selected values, menu anchors and four typography roles / two weights.

Regression owner: `work/src/renderer/src/controlGroupMounted.electron.test.ts` covers actual selection changes for 15 company marks beside a sibling selector, including narrow and zoomed layouts. Native screenshots and installed acceptance are tracked separately from source tests.

## Fluid control-group composition

A logical control group is composed before spacing is distributed. Determine the active capability-aware control set, preserve each approved component's anatomy, measure real painted content in the production component, then evaluate complete one-to-three-row assignments. Compatible controls may change rows. A third row is allowed only after rebalancing all rows and proving that no one- or two-control move can preserve readable defaults.

Use an intentionally small spacing vocabulary. One established group-gap token governs horizontal neighbors and vertical row spacing inside a multi-row group; model or capability changes may alter row membership but never change that rhythm. Separate upper, middle, and footer groups remain independent. Every row shares painted left and right bounds, but full-width alignment never authorizes unlimited track growth.

Every control declares a minimum, preferred, and maximum:

- Model identity ranges from recognizable minimum to catalog compact to full. Closed Video triggers use the canonical short/base identity plus one ellipsis while menus, tooltips, and accessibility retain the full provider/mode label.
- FPS, ratio, duration, and resolution protect complete short default values before Model suffixes or optional slack.
- Quantity and budget keep a fixed inner cluster and only bounded symmetric outer elasticity. The accepted painted left-border-to-minus distance is the minimum on both sides; genuine leftover expands both equally.
- Sound, Save, Settings, and Play/Stop/Rerun are intrinsic or fixed and never absorb row width.
- Settings and Play/Stop/Rerun share the same circular diameter and icon envelope. Footer Sound is a matching icon toggle; footer Save is a matching icon action whose rest state is neutral, saving is amber, recent success is briefly green, then neutral.

Selector rows use one equal painted selected-text-to-chevron clearance across siblings. Reduce that clearance equally as needed to reveal complete selected values, down to a protected 4px minimum. If values still cannot fit, reassign rows or compact Model identity; never preserve a larger sibling gap while another value truncates. Chevrons remain fixed at the shared right inset and selected text remains left aligned.

Acceptance is based on painted geometry: first/last visible borders, border-to-border gaps, first meaningful glyph alignment, fixed chevrons, Quantity outer symmetry, terminal containment, and unchanged component anatomy. Use untransformed CSS `clientWidth` under React Flow zoom. Automated geometry must mount the actual production NodeCard/Utility components with production CSS; handcrafted replicas and wrapper arithmetic cannot prove correctness. User visual acceptance remains the final gate.

## Storyboard ordered-duration selectors

Single Sequence duration options remain visible when the ordered budget makes them unavailable. Disabled rows use `aria-disabled="true"`, `tabIndex=-1`, full-opacity `#8e8999` text, no disabled hover/selected fill, and a central selection guard; Arrow keys, Home/End, typeahead, Enter, Space, and pointer selection must never enter or choose them. The listbox/trigger carries the remaining-budget description. Closed duration triggers and their menus use the shared Smaller text role (compact 8px/Normal 400), and focus uses the existing 2px `#b89cff` treatment without changing the 315px node geometry or viewport-clamped portal behavior.

A system-generated `0s` row is visible, selected, neutral, `aria-disabled`, and never user-selectable or Auto. The trigger remains a focusable menu opener. One derived 8px/400 neutral helper sits between panel grid and footer; locked conflicts may use the existing error color, but budget guidance never overwrites unrelated persisted errors.

## Dependencies

- Design: `visual-and-interaction-standard.md`
- Node behavior: `../features/nodes/node-system.md`
- Verification: `../testing/regression-firewall.md`

## Verification

Validate the shared selector implementation at practical canvas zoom and window sizes in the packaged Flight Tester. Source inspection alone is not visual proof.
