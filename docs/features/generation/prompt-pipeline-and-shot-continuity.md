# Reference-mode ownership — 12 October 2026

Image and Video Generators no longer display or apply the former per-edge Guide/Auto/Lock controls. Existing edge data is retained for persistence compatibility but cannot choose a frame/source role, change media-reference fidelity, or trigger artwork-carrier placement in those generators. Actual native start/end frames and source video remain schema-owned inputs. Character, Wardrobe, Location, Element and Style are fixed authorities within their assigned domains.

Connected bare Image/Video Media uses Reference/Composition-or-Blocking/Object/Background above its mandatory, editable Description. Changing mode resets that Description; typing overrides the template. Mode controls require a real reference connection, while Description also requires placed/generated media and a live generator path. A disconnect hides the section without deleting text. Completed descriptions serialize once into REFERENCE INTRODUCTIONS, retaining semantic tags until adapter translation. Incomplete descriptions and unresolved replacement targets never become provider authority and block generation. A textual Storyboard becomes cumulative timecoded action, not a fictitious attached sheet.

Control prose follows the current Codex Seedance skill and Higgsfield worked reference/edit prompts. Earlier OpenArt attempts are not locking evidence. The actual OpenArt Haji Blender sequence supplies the assets and acceptance target. Precise camera/spatial blocking and proxy-to-character mapping do not assign mannequin limbs or rendered appearance to finished people. Native editing operation support remains a separate provider contract; a mode template alone does not select a paid editing task.

Executable owners: work/src/shared/inputRules.ts, mediaReferenceModes.ts, assetReferenceDescriptions.ts, workflowResolver.ts, referenceInstructions.ts, shotSpec.ts; work/src/renderer/src/NodeCardNext.tsx and legacy NodeCard.tsx. Verification receipts remain in Codex Apps/Prism.

# Prompt Pipeline And Shot Continuity

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/features/generation/prompt-pipeline-and-shot-continuity.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `product-contract.md` → `Prompt pipeline and shot continuity`
- `SKILL.md` → `Prompt pipeline and shot continuity`

---

## Prompt pipeline and shot continuity

- Preserve Storyboard structure and raw enum choices during graph traversal. Compile shot-size and camera wording only after the effective Video Generator family is resolved, using one versioned recipe path for combined prompts and provider-native multi-prompts. Recipe strings are never empty and are capped at 25 words. Storyboard never shows provider-family recipe prose or a generic-fallback banner; hidden request assembly resolves the family while visible controls remain Shot Size and Camera Movement.
- Assemble non-Seedance Video provider text in the fixed production shot-spec order, with semantic scopes in `ACTIVE REFERENCES` and the provider legend in its own required `REFERENCE MAP`. Assemble Seedance text in canonical Seedance order with reference authority, performance, camera, timeline, continuity, final acceptance, and hard avoids each emitted once. Rank optional sections explicitly, stop at the first non-fitting section, and report omitted lower-priority sections. Only authoritative documented family ceilings activate trimming; absent knowledge leaves the ceiling unset. The preview preserves headings and reports omitted sections plus exact character and estimated-token weight.
- Sequence continuity is opt-in and serial. Extract final frames in the renderer without ffmpeg, persist them as managed generated assets, and connect each through a visually distinct machine-generated locked Starting Image edge. Confirm replacement of an authored start frame before billing. On any generation, extraction, persistence, or connection failure, mark the exact shot failed, stop, and leave every downstream shot unchanged.
- Variant comparison renders 2–4 explicit prompt variants only on user action, presents real results side by side, and stores the chosen prompt, provider model, output path, and shot-recipe versions in project-local JSON. Do not infer rankings or statistics beyond the explicit winner.

## Prompt pipeline and shot continuity

- Storyboard traversal preserves structural headers, raw shot enums, and authored shot text. Shot-size and camera prose compile exactly once in `buildGenerationRequest`, after the effective video family is known. Every hidden recipe is versioned, at most 25 words, and never empty. Provider-family recipe names and prose are never visible beside Storyboard controls; an unconnected Storyboard keeps ordinary user-facing Shot Size and Camera Movement choices while hidden assembly resolves the family later.
- Final provider prompts are ranked semantic sections rendered through explicit Seedance, Kling, Veo, Wan, or generic compilers. Non-Seedance Video authored text is `SCENE CONTEXT`, semantic scopes live in `ACTIVE REFERENCES`, and a standalone required provider `REFERENCE MAP` follows. Seedance uses the canonical Seedance heading sequence and assigns each instruction to exactly one section. Add optional sections by explicit descending priority and stop at the first section that does not fit while required correctness gates survive. Unknown ceilings remain unset, and the inspector reports exact characters, estimated tokens, and omitted sections.
- Ordered Video Generator sequences are opt-in and serial. Stop on first failure, leave downstream shots untouched, extract final frames in the renderer, persist them through managed assets, and connect them as visibly distinct locked machine-generated Starting Images. Replacing an authored start frame requires confirmation before billing.
- Prompt-variant comparison is an explicit paid action. Render 2–4 variants side by side, let the user choose one winner, and record the winning prompt, provider model, output path, and shot-recipe versions in project-local JSON without inferred statistics.


## Current scoped exclusions and authored budget repair — 9 October 2026

Source-tested subset, not installed or output-adherence verified. Excluding a Character in one shot no longer withdraws its global identity/reference authority from another shot. Only explicit exclusions shared by every shot may remove an unrelated global Character; authored dialogue speaker/target participation retains identity even when visual presence is excluded. Per-shot active/excluded state and same-body/appearance projection remain unchanged. Typed Character-only requests describe their identity binding in REFERENCE AUTHORITY rather than claiming no external authority. No physical input is reordered or clipped here.

Explicit SUBJECT AND PERFORMANCE, LENS AND OPTICS, EDITABLE VARIABLE REGISTRY and OPENING-FRAME HARD LOCK are mandatory authored blocks even without a connected Character or start frame. A configured budget preserves them or blocks irreducible submission. Optional generated defaults may still be removed through the existing budget owner; unknown ceilings remain unset. Manual masters retain exact bytes.

Seven regressions cover local→later presence with Cut/Continue, presence→local exclusion, all-shot unrelated exclusion, off-camera dialogue, explicit authored fields/budget failure and Manual bytes. Existing full shared compiler/graph/capacity gates remain required. This is bounded parity with our own Codex1.1.22 skill and authored project receipts, not a compiler provenance/version promotion. Native-duration disagreement, final Continue and explicit generated-dialogue intent remain separate correctness gaps.


## Current submitted timing contract — 9 October 2026

Source-tested, not installed. Fixed typed Storyboard or native multiPrompt timing must agree with the actual submitted duration/frame-count plan, including requests that bypass graph traversal. Readiness and transport share the static duration planner; current native fal units come from the owned contract. Native frames use actual native FPS, not visual Motion Cadence. Unsupported values, automatic/unspecified timing for a fixed timeline, ambiguous new units and mismatch fail before paid preparation/submission with authored values preserved. No automatic padding, duration scaling, clipping or model fallback.

Only typed timelines are inspected; Manual prose remains byte-exact. Provider-auto relative Storyboard timing, complete automatic per-panel allocation, final Continue hooks, mixed transitions and explicit generated-dialogue audio intent remain separate required work. Request-timing agreement is not evidence of model output adherence.


## Outgoing continuation fidelity — 9 October 2026

Source-tested subset of Codex Seedance1.1.22 timed-block rules. Final Continue is preserved as an outgoing hook across existing graph, Seedance, generic, native Kling and rewrite owners without inventing subsequent content. Final hook state is required inside its existing timeline/last-shot block, so optional-budget removal cannot silently discard it. Final endpoint prose avoids an unauthored stop; existing explicit authored holds and dialogue remain unchanged.

Unsupported saved transition types block processing with original values retained. Internal missing legacy boundaries keep their existing Cut default. Manual masters retain exact bytes and skip unused compiler-ledger construction. Flash/occlusion interval contracts, generated-dialogue audio intent, complete tableau/crop/spatial parity and provider-auto timing remain separate work. Machine1.1.14 provenance is unchanged.

## Lip-sync default completeness — 13 October 2026

The editable audio Lip-sync template includes the full recording, introductory/lead-in words and original word/phrase spacing. Retain original voice, pitch, tempo, pauses and silent remainder without retuning, stretching, repeating or truncating. Experimental exact duration remains user-authored text/Storyboard data. Existing authored Descriptions are never overwritten. This default is implemented but generated fidelity remains unaccepted; see CURRENT-STATE.md and the Lip Sync Progress change impact. Executable owner: work/src/shared/mediaReferenceModes.ts; regression: mediaReferenceModes.test.ts plus resolver/compiler/native-adapter tests.


## Scoped replacement evidence — 15 October 2026

The user supplied a reference-based subject replacement prompt: retain the base footage’s motion, camera behaviour, timing, people count and audio; replace only the named subject from the actual replacement reference; preserve all other people, environment, lighting, props and background behaviour. This is prompting evidence, not verified provider output fidelity.

Existing Object mode covers an explicitly named subject or object. Its editable image/video template assigns the source as the base and the replacement as appearance only. Video variants preserve duration, original audio and synchronization, source motion and the target’s placement. Background mode applies the same untouched-content discipline to foreground people, identities, outfits, props, lighting and timing/audio while changing only the assigned environment. Image templates remain visual and introduce no audio/timing obligations. Actual replacement targets and attached semantic references must be supplied; unresolved legacy and subject/object placeholders block generation.

Description Revamp must retain an authored base, target, replacement and every authored preservation constraint, without inferring new replacement roles. Typed overrides and existing saved authored Descriptions remain unchanged. Selecting the same mode does not reseed text; changing mode explicitly seeds its current editable template. No project migration or new provider operation is selected.

The shared compiler no longer infers total scene people count from the number of replacement Character references. Scoped Object replacement qualifies automatic face/wardrobe/prop replacement bans as unrequested changes; authored negatives remain exact. Video replacement defaults defer edit points, final state and motion to the assigned base/reference and authored timing rather than adding an invented stable ending. Explicit Continue hooks and Manual provider masters retain their existing authority. Ordinary Reference, Composition, Blocking and audio/Lip-sync behavior are unchanged.

Executable owners: mediaReferenceModes.ts, assetReferenceDescriptions.ts and shotSpec.ts. Regression coverage exercises real resolver requests, semantic introductions, exact physical @Video1/@Image1 mapping, image/video scope, incomplete targets, inferred headcount, endpoint defaults and Manual bytes. The source review used CodeGraph’s explicit-path CLI fallback and a Sol 6.1 High reviewer. No paid output test is part of this update.
