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
