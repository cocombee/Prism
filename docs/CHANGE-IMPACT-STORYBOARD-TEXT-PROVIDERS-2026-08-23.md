# Change Impact — Storyboard Text Providers / OmniRoute — 2026-08-23

> **Status:** Active focused provider correction and integration.

## Last verified checkpoint
- Accepted fallback: `/tmp/prism-seedance-semantic-shot-revamp-tester/mac-arm64/Prism Flight Tester.app`.
- Accepted fallback ASAR: `ba9c2116f0952f4ccab9c4674708ca34997d574943f1f87a3e6adef5789796af`.
- Current source-only Cut/Continue gate: 223/223 affected tests plus TypeScript.
- Local OmniRoute: installed `3.8.49`, process `proc_a290f5792c04`, `/v1/models` responds on `127.0.0.1:20128`.

## Scope
- In scope:
  - remove all OpenRouter/fal text-rewrite code and tests;
  - add local OmniRoute discovery and OpenAI-compatible rewrite support;
  - keep direct OpenAI, Anthropic Claude, Google Gemini, DeepSeek, and Kimi groups;
  - preserve existing grouped selector design `(Provider) -> Model` and allow duplicate model names across provider groups;
  - migrate stale saved `assistantProvider: fal` selections to an available OmniRoute/direct provider;
  - retain honest changed/unchanged Revamp results and camera/action-only sender prompt;
  - tests, TypeScript, build/package/readback, one tester replacement.
- Out of scope:
  - copying or exposing credentials;
  - configuring OmniRoute upstream providers or dashboard password;
  - provider inference during verification;
  - changing fal.ai media-generation behavior;
  - release promotion or Obsidian sync before user acceptance.
- Files allowed to change:
  - `work/src/shared/types.ts`
  - `work/src/shared/assistantModels.ts`
  - `work/src/shared/omniRouteModels.ts` and test (new)
  - remove `work/src/shared/falTextModels.ts` and test
  - `work/src/shared/providerErrors.ts`
  - `work/src/main/index.ts`
  - `work/src/renderer/src/AppNext.tsx`
  - `work/src/renderer/src/UtilityNodes.tsx`
  - `work/src/renderer/src/NodeCardNext.tsx` only for OmniRoute logo fallback if needed
  - focused provider/product tests
  - task status/handoff after verification.

## Dependencies
- Feature/node: Storyboard Revamp Shot / Revamp All.
- Architecture/runtime boundary: renderer selection -> preload IPC -> trusted main -> local OmniRoute or direct provider -> renderer panel replacement.
- API/provider:
  - OmniRoute discovery: `GET http://127.0.0.1:20128/v1/models`.
  - OmniRoute rewrite: `POST http://127.0.0.1:20128/v1/chat/completions`.
  - Direct provider endpoints remain unchanged.
  - fal.ai remains media-only.
- Authentication/authorization: no OmniRoute credential is read or stored; if the local gateway later requires a client token, fail honestly and require user-local setup.
- Contract/schema: additive `omniroute` service/assistant provider; stale `fal` assistant selection remains readable but is not offered or submitted.
- Persistence/data: existing encrypted provider profiles unchanged.
- Design: existing grouped selector and provider/model duplicate rule preserved.
- Tests/release: pure model filtering, main source/contract gates, product surface, existing Cut/Continue and Revamp tests, TypeScript, build/package/readback.

## Protected behavior
- Cut/Continue UI/compiler and 223-test source checkpoint.
- Revamp sender may edit only visible action and selected camera movement.
- Model selection alone never triggers Revamp.
- Same model may be independently listed under OmniRoute and a direct provider.
- Existing OpenAI/Anthropic/Google credentials and profile selection remain untouched.
- No app launch until current tester is saved/idle and stopped exactly once.

## Migration and rollback
- Data/schema: `assistantProvider` gains `omniroute`; stale `fal` selection is normalized at render/run time without rewriting unrelated workflow data.
- Backup/restore: accepted tester remains fallback until replacement launch verification.
- Surgical rollback: restore listed source files and remove OmniRoute helper/test; do not restore OpenRouter files or route.

## Verification
- Targeted tests: OmniRoute model filter, Storyboard provider groups, no OpenRouter source, rewrite selection/outcome, Cut/Continue/compiler/Revamp suites.
- Typecheck/build: required.
- Physical UI: open replacement only; user owns selector/Revamp acceptance.
- Provider calls: none during automated verification.
