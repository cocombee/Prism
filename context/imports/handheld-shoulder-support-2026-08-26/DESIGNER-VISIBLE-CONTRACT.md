# Prism Camera Movement — Handheld Options Final Visible Contract

Status: FINAL DESIGN CONTRACT APPROVED; implementation and rendered acceptance remain Developer/user-owned.
Supersession: this revision supersedes the earlier two-option consolidation decision in this file. Do not consolidate, hide, alias, remove, or remap any of the four current values.
Semantic input: `/tmp/director-handheld-semantic-contract.md` (frozen Director contract). Original source evidence was not reopened.

## Scope and ownership

- Surface: the existing Storyboard `Camera Movement` grouped selector only.
- Integration/source owner: Developer. Designer remains read-only for Prism source.
- Objective: retain four visibly distinct support-texture choices while making the gentle and intense meanings clear with minimal copy changes.

## Exact visible contract

Keep the existing group label exactly:

`Stabilized & handheld`

Keep these four visible options in their existing order, before the remainder of the group:

1. Value: `handheld`
   - Label: `Natural Handheld`
   - Help/title: `Controlled natural handheld movement with organic operator motion while preserving readable framing.`
2. Value: `handheld-subtle`
   - Label: `Gentle Handheld`
   - Help/title: `Restrained handheld micro-drift and gentle breathing motion that preserves the authored framing.`
3. Value: `handheld-intense`
   - Label: `Intense Handheld`
   - Help/title: `Stronger controlled handheld irregularity with a visceral, reactive feel while keeping the subject and action readable.`
4. Value: `shoulder-rig`
   - Label: `Shoulder-Mounted Camera`
   - Help/title: `Shoulder-mounted operator movement with human-weighted sway and restrained body-carried bounce while preserving readability.`

After these four rows, preserve every existing Steadicam, gimbal, slider, and other group option in its current label, help text, value, and order.

### Current label changes

Relative to the current labels recorded in the superseded contract:

- `Natural Handheld` remains unchanged.
- `Gentle Handheld Shake` changes minimally to `Gentle Handheld`.
- `Strong Handheld Shake` changes to `Intense Handheld`.
- `Shoulder-Mounted Camera` remains unchanged.

`Gentle Handheld` carries the user's requested steady/restrained meaning without using “Steady,” which could blur the physical distinction from Steadicam or gimbal. `Intense Handheld` preserves the user's requested intensity cue, while its help text explicitly keeps the result controlled and readable.

## Semantic boundaries

- These are support textures, not camera paths. Selection must not invent or alter camera travel, targets, timing, endpoints, action, impacts, or choreography.
- `Natural Handheld` is controlled baseline organic operator presence: neither minimalized nor strongly reactive.
- `Gentle Handheld` is the restrained option: subtle micro-drift/breathing with framing preservation as the dominant constraint.
- `Intense Handheld` is stronger designed irregularity: visceral/reactive but controlled and readable, with no automatic fight, impact, or event-linked behavior.
- `Shoulder-Mounted Camera` is shoulder-borne weight, sway, and restrained bounce; it does not automatically add reportage, news, ENG, focus hunting, zoom correction, imperfect headroom, or event-linked jolts.
- None of the labels or help strings promises a “commercial-like” result or implies random, digital, indiscriminate, or uncontrolled shake.
- Steadicam and gimbal remain mechanically stabilized and semantically distinct. Do not rename any of these four options with “Steady,” “Steadicam,” “gimbal,” or wording that implies stabilization equivalence.
- Director's four-way distinction is cinematic semantics, not proof of repeatable provider-level separation.

## Compatibility and preserved UI

- Retain the exact persisted values `handheld`, `handheld-subtle`, `handheld-intense`, and `shoulder-rig` for their corresponding visible rows.
- Introduce no new values or aliases. Do not consolidate, remap, migrate, or rewrite existing saved values.
- Saved-project compatibility follows naturally: each existing value remains directly selectable, displayable, and persistable as itself.
- Preserve the existing `StoryboardCompactSelect` group order, trigger, option-row anatomy, title/help behavior, accessible naming, listbox/option roles, `aria-selected`, keyboard behavior, typeahead, focus return, pointer behavior, positioning, scrolling, typography, dimensions, spacing, colors, borders, radius, chevron, ellipsis, states, CSS, and surrounding layout unchanged.
- Add no icons, badges, fields, controls, sections, separators, in-row descriptions, CSS, or layout changes.

## Acceptance criteria

1. All four values remain visible and distinct in the exact order, labels, and help strings specified above.
2. No value is hidden, removed, aliased, consolidated, remapped, or replaced.
3. Existing saved projects retain their exact stored values and resolve directly to the matching visible option without fallback or mutation.
4. Gentle is clearly the restrained/steady meaning; Intense is clearly stronger but controlled, readable, and not fight- or event-specific.
5. Natural remains distinct from Gentle and Intense; Shoulder-Mounted remains distinct from generic handheld and from Steadicam/gimbal.
6. All selector/UI/CSS/keyboard/accessibility anatomy and all unaffected group options remain unchanged.

## Decision provenance

User-selected decisions:

- Do not consolidate options that produce meaningfully different output.
- Retain all four visible values: `handheld`, `handheld-subtle`, `handheld-intense`, and `shoulder-rig`.
- Keep gentle/steady and intense meanings clear while retaining distinct outputs.
- Introduce no new values or aliases; preserve group order, compatibility, selector anatomy, UI, CSS, keyboard behavior, and accessibility.
- Add no icons, badges, fields, controls, CSS, or layout.

Director-derived decisions consumed as fixed semantic input:

- Natural = controlled baseline organic operator presence.
- Gentle = restrained micro-drift/breathing that preserves framing.
- Intense = stronger designed irregularity that remains controlled/readable and does not imply fighting or event-linked response.
- Shoulder-mounted = weighted sway and restrained body-carried bounce, without automatic ENG/reportage behaviors.
- Handheld/shoulder support texture remains distinct from Steadicam/gimbal and from camera-path semantics.

Designer-derived visible-copy decisions:

- Keep `Natural Handheld` and `Shoulder-Mounted Camera` unchanged.
- Remove “Shake” from the gentle label to avoid random/uncontrolled implications.
- Use `Intense Handheld` to retain the user's clear intensity cue while the exact help string constrains it to controlled, readable irregularity.
- Avoid “Steady” in the label because Gentle already expresses the restrained meaning and “Steady” could be mistaken for Steadicam/gimbal stabilization.

## Handoff boundary

Developer may implement only these four label/help-string changes while preserving the four values and every existing selector behavior. No Prism source, CSS, documentation, profile, task, or Obsidian artifact was modified by Designer in producing this contract.
