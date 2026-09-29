# Storyboard Regression Matrix

> **Status:** Required

| Surface | Protected behavior | Verification |
|---|---|---|
| Node identity | Storyboard remains `NodeKind` and graph node | node registry/type tests |
| Ports | Storyboard signal and target compatibility remain typed | node port/connection tests |
| Panels | prompt, duration, shot size, camera, audio cue, lock state persist | Storyboard generation tests |
| Migration | legacy/retired Storyboards migrate without silent loss | Storyboard migration tests |
| Provider compilation | order, context, locks, ceilings and modes survive | shot spec/reference tests |
| Typed continuity schema | optional group/cast/exclusion/state/delta/authority/dialogue fields remain load-safe and propagate intact | workflow resolver/typecheck |
| Edited active-cast ledger | same-group inheritance, explicit deltas, exclusions, compact per-shot state, unknown omission | seven-shot restaurant shot-spec fixture |
| State authority/dialogue | post-cut meal state never blends; world-relative trajectory and one continuous byte-exact dialogue span survive | shot-spec/provider-body tests |
| Current-shot projection | Shot 1 emits only current bindings/state plus active off-camera work; later reverse/screen/camera/action values remain typed until their owning shot; Revamp early anticipation rejects atomically | shot-spec + Director validation + Storyboard rewrite tests |
| Single-state authority | exact required state plus explicit conflicting available-state inventory blocks before submission; one state across multiple views passes; unknown inventory invents no conflict; post-cut authority begins at the exact cut | shot-spec/provider submission tests |
| Prism semantic-tag negative scope | lowercase canonical semantic tags retain existing punctuation/possessive behavior through completion and Revamp; adapter-only transport translation remains request-local; no OpenArt ordinal lexical validator exists in Prism | shot-spec + Storyboard rewrite tests |
| Continuous mode | no synthetic cuts, shot boundaries, or repeated typed boundary boilerplate | shot-spec tests |
| Semantic parity | Locked/Auto, Composed Prompt, request, semantic provider body match before adapter-only ordinals; final section is `NEGATIVE PROMPT` | provider prompt body tests |
| Revamp preservation | active-cast-scoped connected context excludes unrelated Characters; whole-sequence immutable typed manifest; retained authored typed-value checks; exact ordered all-target validation and atomic apply | Storyboard rewrite + renderer source-contract tests |
| Prompt budget | under-limit body unchanged; configured limit source and measured/compressed counts inspectable; duplicate optional prose compresses deterministically; irreducible mandatory state blocks without truncation | provider prompt body tests |
| Reference-exclusive authority | connected Character/Wardrobe/accessory/helmet fixtures emit exact anchors, typed role/ownership and sole authority; metadata appearance is absent; one named delta appears once; no-reference authored prose remains byte-exact; binding/delta survive compression and irreducible limits block | provider prompt body + shot-spec tests |
| Revamp appearance safety | hidden visual manifest excludes captions/metadata and declares sole authority; Shot rejects invented cyan/blue/material/pattern/frame/lens attributes; All validates before one atomic apply | Storyboard rewrite tests |
| Director provenance | Seedance 1.1.11 and exact source hash; reference-exclusive behavior uses only SD-AB-001, SD-AB-002, SD-PS-007, SD-PS-008, SD-PS-004; global guidance versions/hashes remain evidence only; historical extraction fingerprint remains immutable | Director contract tests |
| Assets | promotion, deletion, deployment and relinking remain coherent | asset deployment tests |
| Persistence | workflow save/load preserves Storyboard state | workflow/persistence tests |
| Renderer | editor, generation, errors and output remain usable | product-surface and physical QA |
| Image-layout migration | legacy Storyboards default to persisted Multi with `16:9` / `2K` defaults | Storyboard migration tests |
| Multi image layout | one numbered two-to-eight-panel sheet uses selected ratio/size | Storyboard generation and physical QA |
| Single image layout | exactly one effective panel/image is generated while authored Multi panels remain reversible | generation, resolver, save/load and duplicate tests |
| Downstream references | Video Generator receives the current non-stale image and the same effective panel set | workflow resolver/provider request tests |
| Ratio-aware previews | library and large preview contain the selected/natural ratio without crop | active-renderer source and physical QA |

A Storyboard change must run all affected rows, not only its local unit test.
