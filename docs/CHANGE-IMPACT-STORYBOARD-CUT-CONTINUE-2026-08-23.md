# Change Impact — Storyboard Cut / Continue Boundaries — 2026-08-23

> **Status:** Active focused source/test change; packaging is blocked while the separate rejected OpenRouter/provider-routing branch remains unresolved.

## Last verified checkpoint
- Checkpoint ID: semantic-SHOT / missing-only completion / Storyboard AI-Revamp tester.
- Accepted fallback artifact: `/tmp/prism-seedance-semantic-shot-revamp-tester/mac-arm64/Prism Flight Tester.app`.
- Accepted fallback ASAR SHA-256: `ba9c2116f0952f4ccab9c4674708ca34997d574943f1f87a3e6adef5789796af`.
- Passing verification at checkpoint: 216/216 focused tests, TypeScript, production build, arm64 package, ASAR readback, live AX inspection.
- Current pre-change source hashes:
  - `types.ts`: `f20873cb910d8fb0cc17d4305a6f21d8f4ea0be77ec13a9727704c12b3ea0d50`
  - `workflowResolver.ts`: `5187431eb73db4fd3e81b66838f771449c78e27f61deadbcbc223eb6282914a2`
  - `shotSpec.ts`: `47c00244a0c401101055e5c9b13ca617d2bc0c67bdf9f8779621754e4380e434`
  - `storyboardRewrite.ts`: `885ce82a7299bc6b2500110316388e18426c0a1abc55571be297e031f08bcbac`
  - `UtilityNodes.tsx`: `b5e8eb293f088d6808b44482809d58dff13acf048b54c67194d0c057a892c681`
  - `styles-next.css`: `3a8efcd14a8e8c4f5e8fba41c965904afbb46deaef819ea38c96ed20abbdac35`

## Scope
- In scope:
  - word-only exclusive `Cut | Continue` transition control beside the existing Revamp Wand;
  - persisted boundary metadata;
  - workflow resolution;
  - Seedance all-cut, all-continue, and mixed SHOT/BEAT compilation;
  - AI Revamp boundary preservation;
  - focused regressions and TypeScript verification.
- Out of scope:
  - OpenRouter, OmniRoute, fal/direct model routing, credentials, provider calls, generation, package launch, promotion, or Obsidian sync.
- Files allowed to change:
  - `work/src/shared/types.ts`
  - `work/src/shared/storyboardSequence.ts` (new)
  - `work/src/shared/storyboardSequence.test.ts` (new)
  - `work/src/shared/workflowResolver.ts`
  - `work/src/shared/workflowResolver.test.ts`
  - `work/src/shared/shotSpec.ts`
  - `work/src/shared/shotSpec.test.ts`
  - `work/src/shared/storyboardRewrite.ts`
  - `work/src/shared/storyboardRewrite.test.ts`
  - `work/src/renderer/src/UtilityNodes.tsx`
  - `work/src/renderer/src/styles-next.css`
  - `work/src/renderer/src/productSurface.test.ts`
  - this impact record.

## Dependencies
- Feature/node: Storyboard panel editor and connected Video Generator.
- Architecture/runtime boundary: renderer → persisted panel data → workflow resolver → provider prompt compiler.
- API/provider: no endpoint change; no provider invocation.
- Authentication/authorization: none.
- Contract/schema: additive optional `transitionToNext` field; legacy missing value means hard cut.
- Persistence/data: additive backward-compatible field; final-panel boundary ignored.
- Design: existing bottom-right action tray; lightweight word segments; Revamp remains sole icon.
- Tests/release: focused pure helper, resolver, compiler, Revamp, and product-surface tests; TypeScript. Packaging deferred.

## Protected behavior
- Existing behavior that must remain unchanged:
  - exact semantic anchors in visible Composed Prompt;
  - hidden ordinal attachment translation;
  - fully authored prompts preserved byte-for-byte;
  - partial prompts receive missing-only completion;
  - Revamp triggers only on click and preserves tags/dialogue/locks/timing/camera;
  - Wand hit testing and pointer ownership;
  - legacy workflows compile every absent boundary as hard cut.
- Sibling nodes/surfaces at risk:
  - Separate Shots mode, Storyboard Asset persistence, Video Generator prompt preview, Storyboard sheet generation, and saved workflow migration.

## Migration and rollback
- Data/schema change: optional `StoryboardPanel.transitionToNext: 'hard-cut' | 'continue'`; no version bump required if readers normalize absence.
- Backup/restore proof: accepted fallback app remains untouched; no real workflow mutation is used for tests.
- Surgical rollback set: restore the listed pre-change files and remove `storyboardSequence.ts` plus its test; rerun the pre-change focused gate.

## Verification
- Targeted tests:
  - `storyboardSequence.test.ts`
  - `workflowResolver.test.ts`
  - `shotSpec.test.ts`
  - `storyboardRewrite.test.ts`
  - `productSurface.test.ts`
- Cross-boundary regression tests: `savedGraphSecretPrompt.test.ts`, `ProviderPromptPreview.test.tsx` if compiler behavior changes their fixtures.
- Typecheck/build: TypeScript required; production build/package intentionally deferred while provider-routing source is unresolved.
- Physical UI/provider/release checks: none in this pass; no provider call or tester replacement.
