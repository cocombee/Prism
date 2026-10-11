# Storyboard Provider Shot Contract

> **Status:** Current

Storyboard contributes structured shots, global context, mode, duration, reference authority, and positive locks to generation. Provider-native compilation occurs at the provider boundary; the authored node state must remain reusable and provider-independent.

Protected behavior includes shot order, duration, framing, camera intent, continuity, reference authority, authored locks, provider ceilings, and redaction of private built-in style instructions from production inspection surfaces.

Executable owners: `src/shared/storyboardGeneration.ts`, `referenceInstructions.ts`, `shotSpec.ts`, `workflowResolver.ts`, and their tests.

## Typed bounded continuity compiler

- Exact physically connected Character, Wardrobe, Element/accessory, and Location references use one optional canonical visual-authority representation. They default to `reference-exclusive`; text-only/unconnected authority remains `text-described`; `reference-plus-authored-delta` permits exactly one explicit named appearance property/value while the reference owns every unnamed property. Metadata descriptions and captions never migrate into the delta or prompt budget.
- The canonical semantic projection repeats exact anchors, typed role, Character ownership/use, and sole-authority scope at point of use without redescribing colour, material, construction, pattern, shape, fit, markings, frame/lens, or accessory design. Explicit authored appearance prose outside reference-owned scope remains byte-exact. Reference binding and any explicit delta are mandatory blocks through compression; an irreducible selected-model limit blocks rather than truncates them.

- Optional Prism-local fields carry continuity-group identity, ordered active Character tags, explicit exclusions, authored Character state, sparse deltas, state-scoped prop/meal authority, optional exact-state requirements and explicit available-state/view inventories, and dialogue spans. Existing `incoming`, `outgoing`, and `held` arrays remain valid; absent typed values remain unknown and are never inferred from prose or image inspection.
- In edited coverage, each shot inherits the complete preceding state only for the same active continuity group, applies explicit typed deltas, removes explicit exclusions, and emits one compact `CHARACTER STATE` line per active Character independently of prose tags. Provider-visible shot prose contains only state active, visible, physically continuing now (including off-camera work), or required at that shot endpoint; future reverse/front projection, later screen side/camera relation, and later action remain inspectable in the typed ledger until their owning shot. Continuous waypoint mode emits no synthetic shot-state or boundary boilerplate.
- `before`, `post-cut`, and `final-transferred` authorities are shot-scoped. A post-cut authority governs the first incoming frame without blending the prior object state. When an exact required state is authored and the explicit authority inventory contains multiple distinct physical states, executable Seedance readiness blocks with a deterministic single-state-reference diagnostic. One physical state shown across multiple `referenceViews` remains valid; unknown inventory stays unspecified. Dialogue spans preserve one exact line, speaker, target, delivery, and lip-sync state; insert coverage may continue audio without repeating the line.
- One provider-neutral semantic master governs Locked/Auto completion, Composed Prompt, Storyboard request/autofill, and the semantic provider body. Semantic tags remain visible; provider ordinals are adapter-only. `NEGATIVE PROMPT` is always the final completed section.
- Revamp Shot receives the whole ordered immutable typed manifest and may change only target prose. Connected Character context is scoped to the target's active cast before provider input; unrelated or explicitly excluded Character tags are absent. Future ledger state remains read-only and may not be narrated early. Revamp All validates exact target order, retained authored typed-state values, and every panel before one atomic apply; typed fields are never provider-editable.
- A configured selected-model character ceiling is measured against the exact uncompressed semantic body. Under-limit text passes unchanged; only an over-limit body receives safe deterministic optional-line deduplication/compression. Diagnostics expose limit source, measured count, compressed count, and an exact blocking reason; irreducible mandatory state blocks submission without truncation.

Director provenance is Seedance `1.1.11`, SHA-256 `3d269a485e793854cedcfa404d9b41526db02181b0281754c1132341006f6203`. Prompt Revision and Asset Binding `1.1.5` (`a46a3d48366625bd02359e597e25e37e105f85384aae52bc0acae710d75f939f`) and Deterministic Prompt Compilation `0.1.4` (`a2ece7f2ece633a948366ca844305ea9cfdcce3b6c07d90ff2ae10aa4487d961`) are implementation guidance/evidence only and are not Seedance Director provenance. Reference-exclusive behavior remains bound only to promoted IDs `SD-AB-001`, `SD-AB-002`, `SD-PS-007`, `SD-PS-008`, and `SD-PS-004`; the previous source hash remains only the immutable historical extraction fingerprint. Prism field names, enums, ledger, state inventory, manifest, budget diagnostic, and parity checks are local representations, not invented Director IDs. Bare Prompt and manual/OpenArt workflow behavior—including lowercase `@imageN` lexical validation—are intentionally excluded from Prism runtime behavior. Canonical Prism semantic tags and request-local adapter translation remain unchanged.


## Current generated-prompt adaptation — 9 October 2026

New general prompts use plain reference assignments, such as “Use @maya as Maya” and “Use @coat for @maya's wardrobe.” Body counting, explicit layer scopes, conflicts and suppression remain typed invariants. Generated ASSISTANT TASK, EDIT CONTROL and EDITABLE VARIABLE REGISTRY bookkeeping is omitted; explicit legacy authored fields remain supported without migrating an approved master.

Qualified Natural Skin instructions are visible in the canonical body before budgeting, with negatives merged into its final NEGATIVE PROMPT section. Submission adds no hidden skin block. Manual/User overrides preserve exact bytes including CRLF and whitespace; only actual bound reference tokens are translated by Seedance's transport adapter. Unviewed exact-reference description metadata does not establish skin treatment.

This is partial implementation of our Codex Seedance 1.1.22 behavior. Full-skill parity remains open; machine provenance is not bumped from 1.1.14 by these changes. Native provider efficacy and desktop acceptance are separate gates.


## Current shot-local exclusion and budget ownership — 9 October 2026

`shotSpec.ts` uses one sequence-wide exclusion intersection for the global ledger and Seedance authority. A single local exclusion cannot erase a later Character identity. Dialogue participation retains an off-camera identity; it does not make that Character visually active. Existing local state exclusion remains unchanged, and an unrelated Character excluded in every shot still has no global authority prose. Stable typed identities appear in REFERENCE AUTHORITY when their detailed same-body authority is correctly assigned per shot. Physical transport order and reference arrays remain owned by their existing adapters.

Explicit performance, optics, variable registry and opening lock are required budget blocks, including with no external Character/start frame. Authored settings survive configured compression or submission fails without truncation. Manual authored bytes remain protected. Tested source behavior is a subset of CodexSeedance1.1.22; current machine provenance1.1.14 remains unchanged. The earlier provenance extraction above is historical baseline evidence. Desktop installation, generated adherence, duration/transition/audio-intent gaps and final whole-app stress are not proved by this repair.


## Final Continue and unsupported saved boundaries — 9 October 2026

Source implementation only. Internal Continue beats still group into the same unbroken shot; internal Cut boundaries still create exactly one hard cut. Final Continue now survives graph normalization, upstream/compiled Storyboard prose, Seedance timeline, generic required shot text, native Kling group output and both single/batch rewrite contexts as one outgoing continuation hook. It adds no next beat, cut, shot or duration. A locked last panel remains read-only context. Final Cut/missing final boundary emits no invented terminal hard cut.

The final Seedance endpoint guidance retains authored state and does not invent a stop for this hook; authored stop/hold instructions remain untouched. Saved unsupported transition types remain intact and block graph/prompt/rewrite processing instead of becoming hard cuts. UI normalization is non-throwing; its existing controls and tokens are unchanged. Missing legacy internal boundaries retain their established hard-cut default. Typed flash/occlusion intervals are still unimplemented; fail-closed preservation is not full mixed-transition support.

Seven actual graph/compiler/rewrite regressions cover grouped counts/totals, locked context, unknown saved transitions and approved Manual bytes. Manual compiler metadata no longer builds/validates an unused graph ledger. This is not installed, generated-output or complete current-skill parity evidence.


## Authored camera timing and playback — 9 October 2026

Generated Seedance timeline and bridge subwindows use the authored decimal precision, with at least one displayed decimal and no one-decimal rounding of finer cut times. Each interval retains its authored duration. Generic endpoint, support and camera recipe guidance preserves authored pace and state; deceleration, recovery and holds are added only where authored. Continue support follows the actual authored path and does not manufacture a vertical direction. Dialogue/audio may continue across a declared span; an endpoint does not create a new pause or require every line to finish at each beat.

When overall or per-beat prose contains authored playback/capture timing, the shared filmic-motion owner preserves those intervals and states only the selected delivery cadence. It does not equate delivery FPS with capture FPS, calculate reciprocal exposure from delivery, select a playback factor or derive physical rig velocity from the full shot duration. An explicit unambiguous global capture/shutter pair is checked against that capture rate; per-shot authored rates remain in their owning prose. Ordinary requests without authored playback timing retain the existing normal-speed default. Manual and recognized complete masters retain their existing exact-body ownership.

Executable owners: `work/src/shared/storyboardTimecodes.ts`, `shotSpec.ts`, `shotRecipes.ts`, `cameraSupportSemantics.ts`, `filmicMotion.ts`; behavioral coverage includes `cameraTimingCompilation.test.ts` and neighboring prompt/support tests. This repairs compiler contradictions, not a new calibrated camera-speed control or proof of generated video adherence. Full current-skill geometry, timed motion controls, interval validation and output verification remain separate open gates.


## Current model duration and beat floor — 10 October 2026

Generated typed Storyboard panels require at least1.0s. New menu selections advance in0.5s steps; saved valid finer decimal timing and decimal bridge/action/reaction subwindows stay exact. The floor belongs to the authored panel, not each subwindow or every provider-native shot group. Exact Manual/recognized-master ownership remains unchanged.

`videoDurationLimits.ts` projects only current declared limits and values. Native endpoint/fingerprint ownership precedes observation; frame counts use the selected declared FPS, enum strings retain their units, and conditional constraints use actual/defaulted owned values. Defaults are values, not maximum evidence. Unsupported root alternatives, unknown timing units, missing contracts, automatic selections and invalid saved values do not become a Wan fallback or a silently fixed budget. Existing native schema validation and exact total-duration equality remain authoritative before submission. Legacy Wan requires17–161 exact frames at4–60fps and rejects unsupported automatic duration. Native Kling still requires integral1–15s groups and integral3–15s clip totals; Continue beat grouping does not round or pad authored timing.

Video Generator shows the verified clip maximum on its compact surface. A source-timed Genjutsu route instead identifies its30s source-video ceiling; this is not an editable output-duration guarantee. Unverified limits are labelled unverified. A sparse native clip enum is not reused as the panel menu: the independent1.0s/0.5s authoring sequence is bounded by the actual maximum. A model4s clip minimum therefore does not force each beat to4s; the whole authored timeline must meet the selected route before generation.

Canonical UI/persistence behavior is in `storyboard-node.md`. Source, actual compiled preflight and isolated rendered-node evidence cover the duration slice; authenticated output efficacy and the final whole-app stress remain separate gates. The unchanged parent and candidate both produce one transient ResizeObserver notification when overflow feedback changes node height; geometry then stabilizes. This existing layout issue is retained in the inspection record, not counted as resolved.

## Separate framing, optics and timed movement — 10 October 2026

Optional `lensMm` survives panel/request serialization, workflow resolution and Revamp context. Both visible and submitted provider compilations, including native Kling multi-shot entries, receive it independently of shot size. Shot size no longer supplies fabricated horizontal FOV degrees. Required authored camera directives survive the compact direction budget.

Continue uses the selected next operation once over its full interval rather than inserting a second bridge operation or reserving invented reaction/settle time. Static with changing framing is a repair diagnostic; compatible dolly/optical zoom can bridge changing framing. Explicit focal-length changes require a compatible optical operation and direction. Dolly zoom preserves subject size and cannot stand in for a crop change. Real rig feasibility depends on authored travel/extent; subject framing alone cannot establish a universal minimum travel time. Existing saved reserved-time metadata remains readable. No generated-video adherence is claimed by local compiler tests.

User-approved default panel (10 October 2026): Close-up, 50mm, 5.0s, Static / Locked. Creation and append share the same factory; saved values stay unchanged. The four controls use their default labels as width references and remain on one row, truncating longer selections with ellipsis inside the existing inset and chevron clearance. The shared allocator and padding tokens are unchanged.
