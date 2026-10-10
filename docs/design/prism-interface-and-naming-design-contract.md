# Prism Interface and Naming Design Contract

Status: Developer-ready Designer contract
Design contract version: 0.1.0
Consumes: `PRISM_SYSTEM_SCOPE_AND_NAMING.md`, specification version `0.1.0`
Design owner: Designer
Implementation owner: Developer

## 1. Purpose and design boundary

Prism is a provider-neutral semantic directing and compilation workspace. The interface makes a directing decision inspectable, editable at the intent layer, and exportable as equivalent prompt artifacts. It must not make Prism look like a media generator, provider marketplace, credential manager, or execution console.

The interface presents these distinct things without redefining them:

- `DirectingIntent`: what the user asks for.
- `Prompt Structure`: the whole-prompt assembly authority.
- `Attribute Breakdown`: atomic directing-rule authority.
- `DirectionPlan`: the provider-neutral resolved decision.
- `BarePrompt`: a complete self-contained prompt.
- `ProviderPromptPlan`: a structured compilation artifact for an adapter, not a network request.
- `SemanticParityReport`: proof that the two renderings carry the same decision.
- `CompilationDiagnostic`: an explicit error, warning, or information item.
- `AuthorityManifest`: verified reference roles and provenance.
- `CapabilitySnapshot`: an externally verified, time-stamped provider/model capability input.

Prompt Structure and Attribute Breakdown are always shown as separate authorities. They may be used together in a plan, but the UI must never flatten them into one generic knowledge table.

### Explicit non-goals

Do not expose or imply:

- Generate, Run, Submit, Spend, Buy Credits, or automatic provider execution.
- Credential entry, billing, provider account management, retries, or transport logs as Prism semantic features.
- A universal cinematic look preset.
- Provider transport tokens such as `@Image1` as semantic names.
- A generic “Workflow” name field in the application header.

If execution is added later, it must be a separate, explicit action outside compilation and must not reuse the primary Compile button or success state.

## 2. Design provenance and protected identity

This contract extends the existing Prism Foundry product language; it does not replace it.

Preserve the established flat dark identity, original Prism Foundry branding, restrained purple accents, shared controls, and semantic state treatment. Existing Prism implementation and design files remain read-only for this task; Developer is the sole source writer for any implementation.

Normative visual references consulted:

- `docs/design/visual-and-interaction-standard.md`
- `docs/design/selector-and-discrete-controls.md`
- `docs/CURRENT-STATE.md`
- `skills/prism-foundry-product-standard/SKILL.md`

The source standard's regional values remain the host baseline:

- shell/header/footer: `#17161b`
- body: `#121116`
- input/media well: `#111015`
- border: `#302d37`
- divider: `#2a2730`
- neutral disabled/support text: `#8e8999`
- keyboard focus treatment: `2px #b89cff`

Use existing shared Prism tokens for primary/secondary text, semantic purple, error, warning, success, hover, and selected surfaces. Do not add a new semantic color merely for Prism. State must always be communicated with text or an icon in addition to color.

## 3. Chosen initial form factor and information architecture

The initial surface is a desktop-first local-first macOS workspace inside Prism Foundry. It is usable at the existing `440px` minimum application width. The dense three-pane composition is preferred at roomy widths; panes collapse in a fixed order at narrow widths rather than forcing horizontal overflow.

### Primary navigation

Use a compact left application rail with these destinations, in order:

1. `Plans` — saved and new DirectionPlan workspaces.
2. `Knowledge` — separate Prompt Structure and Attribute Breakdown branches.
3. `Capabilities` — verified provider/model snapshots used for provider-targeted compilation.

Diagnostics and parity are plan-local views, not top-level destinations. Do not add an Admin, Billing, Credentials, Marketplace, or Generation destination to the Prism semantic surface.

### Plan workspace composition

At roomy widths, the plan workspace uses three bounded regions:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Prism Foundry   Direction Plan: <friendly name>   Saved   [Compile]  [...] │
├───────┬───────────────────────────────┬────────────────────────────────────┤
│ Plans │ INTENT                        │ RESOLVED DIRECTION                  │
│ Know. │ required inputs                │ summary / shot order / timing      │
│ Caps. │ constraints / references       │ selected shot detail               │
│       │ output mode                    │ compatibility / endpoint / hold    │
├───────┴───────────────────────────────┴────────────────────────────────────┤
│ [Diagnostics / References / Provenance / Outputs / Parity] inspector tabs  │
└────────────────────────────────────────────────────────────────────────────┘
```

- Left intent region: the editable source of user intent.
- Center resolved region: the read-only or explicitly overridden result of resolution.
- Right inspector: diagnostics, references, provenance, outputs, and parity for the currently selected plan/shot.
- The center timeline and right inspector must never obscure the required intent controls.
- Each region scrolls independently only when its content genuinely overflows.

At `720–1079px`, keep the intent region primary, collapse the inspector to a viewport-safe drawer, and reduce the navigation rail to the existing compact icon treatment. At `440–719px`, use one column with an explicit segment/tab switcher: `Intent`, `Direction`, `Inspect`. Compile and Save remain reachable without scrolling to a hidden footer.

## 4. Header and plan identity

### Header anatomy

Left to right:

1. Prism Foundry brand.
2. Friendly plan name, shown as `Direction Plan: <name>` at roomy widths; icon-only or truncated with a tooltip at compact widths.
3. Save lifecycle: `Saved`, `Saving…`, or `Unsaved` using the existing Save treatment.
4. Compile action.
5. Overflow menu for non-routine actions such as Duplicate, Export, Rename, and Delete.

The plan name is a mutable display label and is not a stable knowledge ID. It may use human-readable Title Case. Never show a generic `Workflow` placeholder.

`Compile` is the only primary action. Its label remains `Compile`; it never becomes `Generate`, `Run`, or `Submit`.

### Plan lifecycle states

- `Draft`: intent is incomplete or has not been resolved.
- `Resolving…`: a local resolution operation is active; disable duplicate Resolve/Compile actions without hiding the current draft.
- `Resolved`: a DirectionPlan exists and has no blocking diagnostics.
- `Needs attention`: an input, conflict, reference, or timing diagnostic blocks resolution or compilation.
- `Compiled`: requested output artifacts exist and parity passes.
- `Capability limited`: provider-neutral plan exists, but the selected provider/model snapshot is missing, stale, or cannot express one or more decisions.
- `Unsaved`: authored intent or explicit user override differs from the last persisted plan.

Do not add a generating, queued, provider-running, or credit-spent plan state to Prism.

## 5. Intent editor

The intent editor is the only primary editable form. It is organized into stable sections so the user can see what is authored versus derived.

### 5.1 Required intent section

Show required fields first, in this order:

1. `Narrative Beat` — multiline text field; required.
2. `Emotion` — controlled selection plus `Neutral` as an explicit value; required.
3. `Intensity` — measurable scale/range or explicit neutral state; required when the selected emotion requires it.
4. `Subject and Motion` — subject description plus requested subject motion; required.
5. `Duration` — numeric value with unit and legal bounds; required.
6. `Output Mode` — segmented control: `Bare Prompt`, `Provider Prompt Plan`, `Both`; required.

Do not compress the required fields into one freeform prompt box. A freeform narrative field may coexist with structured controls, but it cannot replace required semantic inputs.

### 5.2 Conditional directing controls

Reveal only when relevant, while keeping the section heading visible:

- `Start Shot Size` and `End Shot Size` when a framing change is requested.
- `Dialogue` and `Speaker` when dialogue is requested.
- `Continuity Anchors` for multi-shot work.
- `Look Intent` when a non-neutral look is requested.
- Optional preferred/forbidden technique, genre, realism, lens, angle, move, transition, or audio intent.

Use physically meaningful labels and values. Do not present `Fast`, `Dynamic`, or `Cinematic` as complete values without a measurable qualifier or semantic mapping. Display friendly labels, but persist canonical enums such as `dolly_in`, `truck_left`, `static`, `hard_cut`, and `occlusion_edit`.

### 5.3 Preferences and overrides

Place preferences under `Preferences and Overrides`, below required intent. A preference is never styled as evidence-backed recommendation.

Each override row must show:

- the field being overridden;
- the user-selected value;
- a compact `User override` badge;
- a `Reset to recommendation` action when a recommendation exists.

The resolved panel must preserve the distinction between recommendation, user override, and provider limitation.

### 5.4 Reference authority editor

References use a repeatable `AuthorityRow`, never an anonymous upload chip.

Each row contains:

- exact authority ID;
- typed role: Identity, Wardrobe/Body, Prop, Location, Motion, Start Frame, End Frame, or Storyboard;
- physical inclusion state;
- shots of use;
- verification state;
- source/provenance disclosure.

Unverified or ambiguous references may be displayed and corrected, but the interface must never invent an anchor, semantic tag, or provider token. The row's state must be visible before compilation.

### 5.5 Capability target

Provider targeting is an optional, separate section named `Compilation Target`.

It contains provider, model, version, verification timestamp, source, and supported controls. The section must clearly state:

- absent or stale capability evidence still allows provider-neutral planning;
- absent or stale capability evidence blocks a claim of executable provider compilation;
- capability controls are evidence from outside Prism, not user-authored cinematic semantics.

A stale snapshot is shown as `Stale capability` with timestamp and source; never silently substitute a current-looking default.

## 6. Resolution and DirectionPlan view

The intent panel ends with a `Resolve Direction` action. In `Both` mode, the same resolved DirectionPlan is the only source for both output renderings.

### 6.1 Resolve interaction

Annotated flow:

```text
[Edit intent] → [Resolve Direction] → [Validate inputs]
     │                 │                    ├─ errors: remain in Intent, focus first fix
     │                 │                    └─ warnings: continue, mark plan Needs attention
     │                 ↓
     │          [Resolve semantic rules]
     │                 │
     │                 ├─ compatibility/contraindication conflict → diagnostic, no silent choice
     │                 ├─ missing/ambiguous authority → blocked binding
     │                 └─ valid result → DirectionPlan + provenance summary
     ↓
[Resolved Direction] → [Compile requested output mode]
```

While resolving, retain the authored form and show a bounded progress state in the action row. Do not replace the form with a spinner-only blank surface.

### 6.2 Direction summary

The resolved view begins with a summary strip containing:

- total duration;
- shot count and cut count;
- output mode;
- recommendation/override/limitation counts;
- overall confidence projection plus evidence count;
- last resolved timestamp.

Confidence is rendered as a decimal `0.0–1.0` plus evidence count in details. A friendly label such as `High confidence` is supplementary, never a replacement for the numeric value.

### 6.3 Shot timeline

Use a vertical ordered shot list, not an undifferentiated prompt preview. Each `ShotRow` contains:

- `SHOT N` and cumulative timecode;
- purpose;
- duration;
- shot size;
- angle/height and lens/optical character;
- movement, speed, distance/framing change, curve, stabilization;
- subject blocking and camera path;
- performance, physics, lighting, environment;
- dialogue/audio timing;
- references used in that shot;
- endpoint composition and reaction hold;
- outgoing transition, except after the final shot.

Selecting a row updates the detail inspector without changing scroll position in the timeline. User overrides show inline, but derived values remain read-only until the user returns to the intent/override control.

### 6.4 Timing and cut arithmetic

Show a compact but inspectable `Timing` card adjacent to the shot list:

- declared total duration;
- each shot duration;
- cumulative boundaries;
- cut count;
- endpoint and reaction hold.

For edited coverage with `N` shots, show `N-1 cuts`. A mismatch is an error, not a warning. Never hide arithmetic behind a tooltip or code-only diagnostics.

## 7. Outputs, parity, and export

The inspector's `Outputs` area has three tabs:

1. `Bare Prompt`
2. `Provider Prompt Plan`
3. `Parity`

### 7.1 Bare Prompt

Show one complete self-contained prompt in a read-only, internally scrolling code panel. Provide `Copy` and `Export` only after the requested output is valid. The content must not contain Prism-only tags, hidden metadata, unresolved placeholders, or adapter transport tokens.

### 7.2 Provider Prompt Plan

Show provider-neutral direction semantics plus explicit provider compilation choices. Use a structured key/value or collapsible JSON-like view for settings and a separate diagnostics list for omitted, approximated, or unsupported controls. Never display credentials, send a network request, or label the artifact an executable request.

If the capability snapshot is absent/stale, show the plan as `Provider-neutral only` and disable provider-plan export with the exact reason.

### 7.3 Parity

The parity tab is a comparison table with one row per required semantic dimension:

- shot count and cut count;
- total/per-shot timing;
- reference authority;
- movement, speed/curve, and endpoint;
- shot size, lens, angle, and focus;
- blocking, physics, performance, and lighting;
- continuity and reaction hold;
- dialogue/audio and look;
- exclusions/negative-prompt handling.

Each row has `Match`, `Mismatch`, or `Not applicable`, plus a concise source location. A material mismatch blocks `Compiled` and both-output export. Do not present a green parity state if any required row is unverified.

### 7.4 Compile state language

- `Compile` is available when required inputs pass validation.
- `Compile with warnings` may proceed only for non-blocking warnings and must retain the warning list in the output.
- `Blocked` shows the first actionable error in the action row and the complete diagnostic list in the inspector.
- `Compiled` means outputs exist and parity passes; it does not mean generated or submitted.

## 8. Diagnostics and validation

Diagnostics are centralized and reusable across intent, knowledge, capability, reference, timing, and output views.

### Severity treatment

- `Error`: red semantic icon plus `Error` label; blocks the affected action.
- `Warning`: amber semantic icon plus `Warning`; output may proceed only when the contract allows it, and the warning remains attached to the artifact.
- `Info`: neutral/purple information icon plus `Info`; explains a transparent choice without implying failure.

Each diagnostic row contains code, human-readable explanation, affected field/shot, and a direct `Fix` or `View` action where one exists. Example code: `PRISM_TIMING_DURATION_MISMATCH` and `PRISM_REFERENCE_UNVERIFIED_ANCHOR`.

Use exact provider/model identity in provider diagnostics when available, but never expose credentials or raw request payloads.

### Required validation behavior

- Missing required input: inline field error, focusable target, no resolve.
- Invalid duration arithmetic: timing card error, resolve/compile blocked.
- Wrong shot/cut count: explicit `N shots require N-1 cuts` error.
- Move without explicit endpoint/hold when required: shot-level error.
- Contradictory rules: diagnostic showing the conflicting rules and why no silent tie-break was possible.
- Contraindication: takes precedence over compatibility; an explicit user override is visibly marked and must provide the safe alternative when required.
- Unverified/ambiguous reference: no invented anchor; block any output that would falsely claim authority.
- Stale/absent capability: allow neutral DirectionPlan; provider executable status remains blocked.
- Provisional knowledge record: unavailable by default for production compilation; explicit opt-in shows a warning and provenance.
- Deprecated knowledge ID: resolve it, show `Deprecated`, and expose `superseded_by`; never rewrite the old ID in stored history.
- Parity mismatch: block compiled/both-output success and link to the mismatched dimensions.

Inline validation must not create layout jumps large enough to hide the next required field. Reserve space for one short helper/error line, but allow a second line to expand content-driven.

## 9. Naming experience

Naming has two separate jobs: friendly display labels and stable semantic identifiers. The UI must make the distinction unmistakable.

### 9.1 Friendly labels

- UI labels are human-readable Title Case: `Reaction Hold`, `Prompt Structure`, `Provider Prompt Plan`.
- Plan names and display labels are user-editable and may change without changing stable IDs.
- A display-label edit shows a normal Save lifecycle; it never creates a new semantic record.

### 9.2 Stable knowledge ID editor

The `Create Knowledge Record` form is available from the relevant branch in `Knowledge`. It has this anatomy:

```text
Branch             [ Prompt Structure ▾ ]
Family             [ camera-movement                  ]
Semantic slug      [ push-in-realization              ]
Stable ID preview  ps.camera-movement.push-in-realization   (read-only)
Display label      [ Push-In Realization               ]
Record version     [ 1 ]
Schema version     [ 1 ]
                 [Cancel] [Create Record]
```

Branch is a two-option segmented control: `Prompt Structure` maps to `ps`; `Attribute Breakdown` maps to `ab`. The form must never allow a third branch.

Family and semantic slug accept lowercase ASCII, with hyphens between words. The preview is computed, not typed. The generated ID is immutable after creation.

Validation rules shown inline:

- branch must be exactly `ps` or `ab` in persisted data;
- family and semantic-slug segments use lowercase ASCII letters, digits, and hyphens;
- dot separates hierarchy only in the generated ID;
- no spaces, underscores, uppercase letters, provider names, file paths, version suffixes, or transport tokens;
- the ID must describe semantic meaning, not UI wording, storage location, provider, or version;
- an existing ID is a conflict and cannot be silently overwritten.

The form shows a live example and a short rule explanation beneath the preview. The canonical ID uses a monospace token style and is copied/exported exactly; it is not converted to Title Case.

### 9.3 Existing, renamed, deprecated, and superseded records

On an existing record:

- stable ID is read-only;
- display label may be edited;
- `record_version`, `schema_version`, and `specification_version` remain separate metadata fields;
- changing semantic meaning requires `Create successor`, not editing the ID;
- deprecation preserves resolvability and shows `Superseded by <stable ID>`;
- replacement requires explicit confirmation and must not silently overwrite or merge records.

The confirmation copy must name both IDs and say that the old ID remains resolvable. Never use a destructive generic `Replace` label without the semantic consequence.

### 9.4 Naming examples in the UI

Show a small collapsible `Naming rules` help panel with correct examples:

- Type: `DirectionPlan`
- Field: `reaction_hold_seconds`
- Enum: `ease_in_hold_ease_out`
- Knowledge ID: `ab.timing.reaction-hold`
- Diagnostic: `PRISM_REFERENCE_UNVERIFIED_ANCHOR`

Show incorrect examples only in help/documentation, not as selectable presets:

- `Fast` without a range;
- `@Image1` as an asset identity;
- `rule_v2_final` as a stable ID;
- provider names inside provider-neutral types.

## 10. Reusable components and exact behavior

### `PrismShell`

Owns application background, top bar, left rail, responsive collapse, focus order, and viewport-safe popovers. Uses the existing Prism shell/header/body tokens.

### `StatusPill`

Used for plan, knowledge, capability, reference, and output states. Same height, radius, typography, and vertical centering across a category; width is content-driven. Required/incomplete is outline-only; ready/connected uses the restrained semantic fill. State text is always present.

### `SemanticBadge`

Compact inline badge for `Evidence-backed`, `User override`, `Provider limitation`, `Unverified`, `Provisional`, and `Deprecated`. Color may vary by semantic state, but typography, padding, and baseline alignment stay consistent.

### `PrismField`

Label, control, helper/error line, and optional provenance affordance. Labels and values are regular weight; only headings and user-facing names use semibold. Error text stays adjacent to its field and is announced.

### `ApplicationSelector`

Shared portalled selector with a fixed checkmark column, readable option rows, viewport clamping, continuous trigger anchoring, and a scrollbar only when content genuinely overflows. Closed selected text remains on its classified scale; menu rows follow the existing readable menu scale. Native OS pickers are not acceptable where checkmarks, grouping, or alignment matter.

### `AuthorityRow`

Exact ID, role, shot scope, verification state, source, and actions. Uses a stable left alignment for the role and ID; long values ellipsize only after accessible/full-detail disclosure remains available.

### `ShotRow` and `ShotDetail`

Ordered number/timecode, compact summary, status badges, and expandable detail. Selection is keyboard reachable; detail changes do not reset the user's timeline scroll.

### `DiagnosticRow`

Severity icon, code, message, affected target, and Fix/View action. Errors and warnings are not represented by color alone. Long diagnostics wrap content-driven.

### `CodePanel`

Read-only monospace output with Copy and Export. Copy feedback uses the established transient notification category and collapses its wrapper after the normal short lifetime; it must not create a permanent green band.

### `ParityTable`

Fixed semantic row labels, explicit result state, and source/target detail. Mismatch rows remain visible until the underlying output is recompiled.

### `StableIdEditor`

Branch control, family, semantic slug, generated ID preview, display label, and independent version fields. The generated ID is never a freeform text input after creation.

### Tooltips and accessible names

Every icon-only, ambiguous, disabled, or state-dependent action uses the shared viewport-level tooltip and an action-specific accessible name. Tooltip copy names the next action, not internal implementation. Keyboard shortcuts are shown only when actually assigned and use the macOS-facing glyph format.

## 11. Visual system contract

### Layout and spacing

Use the existing shared Prism spacing tokens. New surfaces use this compact rhythm:

- `4px`: icon-to-label or badge internal micro-gap only;
- `8px`: adjacent controls, field helper spacing, rail-to-content safety gap;
- `12px`: label-to-control and row-to-row spacing inside a section;
- `16px`: section padding and primary control-group gap;
- `24px`: major pane/section separation;
- `32px`: page title to first section or major composition separation.

Do not introduce one-off spacing for warnings, badges, or status rows. A semantic label changes color/icon/announcement behavior, not the vertical density of its container. Rows with one line remain content-driven; two-line diagnostics expand only as needed.

Every peer row establishes shared painted left/right bounds and one fixed inter-control gap. Do not stretch a short selector, Sound-like intrinsic control, status badge, or Compile action simply to consume remainder. Use the existing selector/discrete-control doctrine when a row contains finite choices.

### Typography

The latest user direction defines exactly three semantic font-size roles. It supersedes the previous enlarged tiers and separate node title/control/support keys:

- **Heading** (`--font-smaller-title`, 18px): Project Library and comparable page titles. The unused 32px `--font-title` token is removed. Continue Working, All Projects and comparable section headings now use Text.
- **Text** (`--font-text`, 14px): section headings and primary names; node names retain their accepted compact 12px size through the same role.
- **Smaller text** (`--font-smaller-text`, 12px): selected/default values, fields, hints, subtitles, metadata and labels such as Multi, Sheets and PNG. Existing compact node/control groups resolve this same role to 8px.

Project and canvas names use the same Smaller text token as navigation menus (12px in the application shell), including library cards, breadcrumbs, project sidebar names, and inline rename fields. The purple CANVAS section label also uses Smaller text, preserving its tracking. The white Canvas page heading retains the 18px Heading role.

There are two base font weights: **Normal** (`--font-weight-normal`, 400) and **Medium** (`--font-weight-medium`, 500). Names and headings may use Medium; field values, selectors and hints use Normal. Existing node regular-weight overrides remain intentional. Browser default bold headings/strong text must resolve to Medium rather than introducing another weight. The user's final 500 instruction supersedes the provisional 550.

Floating menu fonts derive from the actual trigger font and ancestor zoom; they are measured geometry, not additional design roles. Preserve glyph measurement, default selector tracks, row allocation, chevron clearance, intrinsic Quantity and fixed action sizes. FluidControlGroup owns one full-width column of measured rows; an older caller's two-column field grid must not squeeze those rows into one cell.

Emoji stickers and the OpenAI font glyph are artwork; their silhouette sizes are explicit exceptions, not text roles. Stable IDs/prompt artifacts may retain their monospace family, and timing/confidence values may use tabular numerals without adding size or weight tiers.

### Surfaces, borders, and radii

Use the source-standard flat surfaces and shared Prism radii. Borders are restrained and continuous; dividers separate hierarchy without becoming decorative rules. No gradient, drop-shadow, frosted glass, or new decorative texture is permitted as a substitute for hierarchy.

Input wells use the established `#111015` region. Read-only derived panels use the body region; editable sections use the input region. The resolved DirectionPlan and output panels must be visually distinct by surface/border, not by introducing a new hue family.

### Purple and semantic color

Purple communicates active selection, focus, and Prism semantic emphasis. Error, warning, and success use existing shared semantic tokens. A success output is never a permanent green panel; success feedback is transient unless it is a persistent lifecycle state such as `Parity: Pass`, which must also include text and the result icon.

## 12. Interaction, accessibility, and responsive acceptance

### Keyboard and focus

- Tab order follows navigation → plan header → Intent fields → Resolve → Direction timeline → inspector tabs → output actions.
- Every control has a visible focus treatment using the existing `2px #b89cff` rule.
- `Enter`/`Space` activates buttons and selectors; `Escape` closes selectors/drawers/dialogs; arrow keys operate listbox/segmented controls according to the shared selector contract.
- Disabled options use `aria-disabled="true"`, remain readable at full neutral opacity, and cannot be selected by pointer, typeahead, Enter, Space, Home, or End.
- Diagnostics and lifecycle changes are announced through the shared live-region pattern without re-announcing unchanged content.

### Responsive behavior

- At the `440px` minimum width, no header or form control may create horizontal overflow.
- Required intent remains reachable before diagnostics and output detail.
- At compact width, project/plan identity and Save may collapse to icon-only treatment with custom tooltips, but the underlying action and state remain reachable.
- Inspector content becomes a drawer or tab; it must not be rendered off-screen.
- Long stable IDs and prompt lines wrap or scroll inside their owning region; they never widen the shell.
- Selector menus and diagnostic drawers clamp to the viewport and follow their triggering control during resize/scroll.

### Motion

Use short, restrained transitions for drawer/selector and status changes. Do not animate layout geometry in a way that shifts text or changes row height. Reduced-motion mode removes nonessential movement while preserving state changes and focus visibility.

## 13. Annotated end-to-end flows

### Flow A — Create and resolve a neutral plan

1. User opens `Plans` and chooses `New Direction Plan`.
2. Shell creates a Draft with a friendly plan name; no stable knowledge ID is invented.
3. User fills Narrative Beat, Emotion=`Neutral`, Subject and Motion, Duration, and Output Mode.
4. `Resolve Direction` validates required fields.
5. The resolved pane shows `DirectionPlan`, timing, shot order, selected rule IDs, confidence, and provenance.
6. The plan is `Resolved` only when blocking diagnostics are absent.
7. Save persists the user-authored intent and resolved artifact separately.

Acceptance: a neutral state is explicit and never represented by an empty emotion field or hidden default.

### Flow B — Conflict and correction

1. User requests a movement incompatible with a selected constraint.
2. Resolve produces a diagnostic with error/warning severity, affected shot/field, rule IDs, and explanation.
3. The intent field shows the first actionable error; the inspector shows the complete conflict.
4. The UI does not silently choose by file order.
5. User changes the intent or adds a visible override.
6. Re-resolve replaces the stale derived result and clears only diagnostics proven fixed.

Acceptance: the user can see why the conflict occurred and what changed; no hidden fallback is presented as a valid resolution.

### Flow C — Provider-targeted compilation with stale capability

1. User selects a provider/model/version in `Compilation Target`.
2. The snapshot is stale or missing a supported-control proof.
3. UI keeps the provider-neutral DirectionPlan available.
4. Provider Prompt Plan is marked `Capability limited` and export is blocked with the exact capability reason.
5. Bare Prompt may still be compiled if its own validation passes.
6. Refreshing the snapshot revalidates the provider plan; it does not mutate the authored intent.

Acceptance: the UI never claims executable provider output without a verified capability snapshot.

### Flow D — Both outputs and parity failure

1. User selects Output Mode=`Both` and compiles.
2. Bare Prompt and Provider Prompt Plan render from one DirectionPlan.
3. Parity table compares all required semantic dimensions.
4. Any material mismatch marks the plan `Needs attention`, identifies the mismatched dimension, and blocks compiled success.
5. User returns to the affected intent/adapter mapping and recompiles.

Acceptance: a green `Compiled` state is impossible while parity has an unresolved material mismatch.

### Flow E — Create a new stable knowledge ID

1. User opens `Knowledge` and selects the correct branch.
2. User chooses `Create Knowledge Record`.
3. User enters family and semantic slug; the generated ID preview updates live.
4. Invalid characters, wrong case, reserved provider/file/version tokens, and collisions show inline errors.
5. User enters a separate display label and version metadata.
6. Create commits the ID once; later semantic changes use `Create successor` and `superseded_by`.

Acceptance: no persisted ID contains UI wording, provider transport, file location, or embedded version.

## 14. Developer acceptance criteria

Implementation is design-complete when all of the following are true in the actual production surface:

### Semantic hierarchy and ownership

- [ ] Intent inputs, resolved DirectionPlan, outputs, diagnostics, and execution boundary are visually and structurally separate.
- [ ] Prompt Structure and Attribute Breakdown remain separate in navigation, selectors, detail, and provenance.
- [ ] Compile never implies Generate/Run/Submit, and no generation or credential side effect is reachable from this surface.
- [ ] Recommendations, user overrides, provider limitations, evidence, hypotheses, and unverified data have distinct visible states.

### Naming

- [ ] UI labels use human-readable Title Case while canonical IDs use the required dotted/lowercase-kebab format.
- [ ] Branch is exactly `ps` or `ab`; family and semantic slug are validated before preview/commit.
- [ ] Stable ID is generated and read-only after creation; display label and versions are separate fields.
- [ ] Collisions, deprecated IDs, and successors are explicit; no silent overwrite, merge, or ID mutation occurs.
- [ ] Canonical enum, JSON field, type, file, event, and diagnostic examples follow the approved naming table.

### Forms and diagnostics

- [ ] Required fields and conditional fields match the approved `DirectingIntent` contract.
- [ ] Timing arithmetic, cut counts, endpoints/holds, reference authority, conflicts, provisional knowledge, stale capability, and parity failures are actionable and deterministic.
- [ ] Error/warning/info rows include severity text, code, affected target, explanation, and Fix/View affordance where applicable.
- [ ] One-line status/helper rows do not reserve a fixed two-line height or create dead space.

### Visual system

- [ ] Existing Prism dark surfaces, restrained purple accents, shared controls, typography hierarchy, borders, and radii are reused.
- [ ] No gradients, decorative shadows, invented notification dots, permanent green success bands, or generic template dashboard styling are introduced.
- [ ] Peer controls share painted bounds and gaps; finite selectors obey the painted-pixel/application-selector doctrine.
- [ ] Long values remain contained; menus/popovers remain viewport-safe and continuously anchored.

### Responsive and accessible behavior

- [ ] The surface remains usable at `440px` minimum width without horizontal overflow.
- [ ] The three-pane layout collapses to Intent/Direction/Inspect without losing Compile, Save, diagnostics, or output access.
- [ ] Keyboard order, focus ring, accessible names, selector keyboard behavior, disabled-option guards, and live announcements are verified.
- [ ] Color is never the only state signal; reduced-motion behavior is covered.

### Evidence returned by Developer

Return one stable implementation snapshot with:

- changed surface/file list;
- focused tests for naming, validation, diagnostics, parity, and responsive state wiring;
- typecheck/build result when contracts or TypeScript changed;
- rendered evidence at the primary desktop width and one constrained width, including Draft, Resolved, Needs attention, Capability limited, Compiled, naming conflict, deprecated ID, stale capability, and parity mismatch;
- unverified visual states called out explicitly.

Source/tests can prove semantic wiring but cannot alone prove visual balance. Final rendered acceptance remains user-owned unless the user explicitly requests agent-driven visual inspection.

## 15. Protected behavior to preserve

- The existing Prism Foundry renderer and legacy/successor boundaries remain untouched by Designer.
- Existing product-node widths and node-specific compact exceptions remain governed by their current contracts; this workspace must not rewrite them.
- Provider-neutral semantic names never inherit provider transport tokens.
- Compilation remains deterministic, inspectable, and separate from execution.
- Invalid atomic results do not partially mutate the authored plan.

## 16. Handoff

Developer owns implementation, tests, build, and packaging. Designer owns this contract and bounded visual acceptance. Implement the smallest surface that satisfies these criteria, preserve the existing Prism identity, and stop for user visual inspection after one verified candidate rather than expanding into a general dashboard redesign.

Latest creation-action correction: compact page creation buttons (New Project in Home/Projects/Recent and empty states, New Canvas, and the asset-page Create action) share the `creation-action` owner. They use the existing Smaller text size (12px in page context), with one `--creation-action-weight` token at Semibold 600. This user-requested action exception supersedes the two-weight restriction for this family only. Navigation, headings, selectors, node controls, secondary/import actions and large Add Canvas cards retain their existing roles and weights. Font size is not enlarged to the navigation Text role. Frames, padding, colors and interaction behavior remain with their existing owners.
