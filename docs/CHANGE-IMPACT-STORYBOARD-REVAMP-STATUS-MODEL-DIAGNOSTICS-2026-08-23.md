# Change Impact — Storyboard Revamp Status / Text Models / Diagnostics — 2026-08-23

> **Status:** Active focused correction; no provider/catalog/inference request is authorized for verification.

## Last verified checkpoint
- Parent source: current Storyboard connected-context/no-active-Play implementation.
- Working tester preserved until replacement handoff: `/tmp/prism-storyboard-connected-context-no-play-tester-20260823-1551/mac-arm64/Prism Flight Tester.app`.
- Parent verification: 244/244 focused affected tests, TypeScript, production build, arm64 package/open.

## Scope
- In scope:
  - compact Storyboard-only running/error status and CSS ellipsis animation;
  - exact stored running copy `Revamping N panel(s)` and exact visible failure `Could not revamp, check connection.`;
  - shared text-assistant eligibility filtering before newest-three ranking, including OmniRoute output-modality checks;
  - direct rewrite HTTP status preservation and provider-named model-catalog network diagnostics;
  - paid-request copy for Storyboard model selection and Revamp actions;
  - focused tests, canonical Storyboard docs, and a compact Prism task-local skill pitfall.
- Out of scope:
  - provider/model/account/catalog refreshes, credentials, inference, paid requests, saved-provider switching, broad UI changes, legacy `App.tsx`/`styles.css`, full suite, release promotion, or Obsidian sync.
- Files allowed to change:
  - `work/src/shared/assistantModels.ts` and focused test;
  - `work/src/shared/omniRouteModels.ts` and focused test;
  - `work/src/shared/providerErrors.ts` and focused tests if required;
  - `work/src/main/index.ts` and focused source/helper tests;
  - `work/src/renderer/src/AppNext.tsx`;
  - `work/src/renderer/src/UtilityNodes.tsx`;
  - `work/src/renderer/src/styles-next.css`;
  - `work/src/renderer/src/productSurface.test.ts`;
  - `docs/features/nodes/workflow/storyboard/storyboard-node.md`;
  - `skills/prism-foundry-product-standard/SKILL.md`;
  - this impact record.

## Dependencies
- Feature/node: Storyboard Revamp Shot / Revamp All.
- Runtime boundary: active renderer -> existing assistant IPC -> trusted main -> selected provider.
- API/provider: existing request contract only; errors retain non-secret status/identity evidence.
- Authentication/authorization: no credential reads or provider calls during verification.
- Contract/schema: no persisted schema or saved provider-selection migration.
- Design: Storyboard status only; unrelated status typography and generator controls remain unchanged.
- Tests/release: focused pure/source regressions, TypeScript, one build, one fresh arm64 package/open.

## Protected behavior
- Saved `google` + `gemini-3.7-flash` selection is not silently switched.
- Model selection remains free/read-only and never triggers Revamp; clicking Revamp is a paid inference request that may consume provider credit.
- Vision/multimodal text models remain eligible when their output is text; audio/realtime/speech/voice/TTS/transcription/whisper/sound/music models are excluded.
- Provider-scoped duplicate names and newest-three ranking remain intact.
- Connections retains detailed non-secret diagnostics while Storyboard shows only the exact compact failure copy.
- Existing connected-context, tag validation, complete-structured provider skip, Cut/Continue, SHOT/BEAT/HARD CUT, timing, locks, and camera behavior remain unchanged.

## Migration and rollback
- Data/schema change: none.
- Backup/restore: current tester remains untouched until replacement is packaged and ready.
- Surgical rollback: restore only listed files; preserve unrelated working changes and saved provider selection.

## Verification
- RED→GREEN: active Storyboard status/copy/tooltip surface; shared direct/OmniRoute eligibility; status-preserving provider errors; provider-named catalog failures.
- Focused neighbouring gate: assistant models, OmniRoute models, provider errors/main source contract, Storyboard rewrite/product surface.
- Then one TypeScript run, one production build, one fresh arm64 package/open, and immediate stop.
- Explicitly excluded: live provider/catalog/account calls, inference, screenshots, AX/DOM/clicks, ASAR/hash/signing/audit, full suite, promotion, and foreground Obsidian sync.
