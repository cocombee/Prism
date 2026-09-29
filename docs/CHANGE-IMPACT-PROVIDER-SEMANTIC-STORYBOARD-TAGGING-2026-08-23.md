# Change Impact — Provider-Semantic Storyboard Tagging — 2026-08-23

> **Status:** Focused replacement of language-specific source inference with provider-side semantic resolution.

## Scope
- Add one hidden semantic-tagging policy shared by Revamp Shot and Revamp All.
- Expose each connected canonical authority as a provider semantic candidate with typed role and safe name/caption/weak aliases.
- Permit validation of a newly introduced exact canonical tag only when that tag was explicitly available as a connected semantic candidate.
- Remove Malay `fon` and `telefon` translation expansions from source dictionaries.

## Safety boundary
- Provider resolves meaning across languages, dialects, slang, transliteration, colloquial spelling, and minor misspellings.
- Source validation continues rejecting unconnected, non-canonical-case, duplicate, ordinal, hidden-context, and transport-leaking tags.
- Exact authored tags and deterministic exact-safe-alias/single-Location requirements remain protected.
- Ambiguous connected authorities remain no-guess; Revamp All remains atomic.

## Protected behavior
- Preserve sequence point-of-use tags and non-repetitive descriptive continuity, one-panel Revamp Shot mutation, notification lifecycle, editor/history, selector, duration, and native scroll behavior.
