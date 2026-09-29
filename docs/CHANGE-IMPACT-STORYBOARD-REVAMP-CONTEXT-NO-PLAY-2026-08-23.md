# Change Impact — Storyboard Revamp Connected Context / No Active Play — 2026-08-23

> **Status:** Active focused implementation change; no provider invocation is authorized.

## Last verified checkpoint
- Checkpoint ID: Storyboard Cut/Continue + OmniRoute text-provider continuation.
- Accepted working tester to preserve until replacement handoff: `/tmp/prism-storyboard-cut-continue-omniroute-tester/mac-arm64/Prism Flight Tester.app` (present before this change).
- Current documented focused verification: 250/250 affected tests, TypeScript, production build, and arm64 package creation; physical acceptance remains user-owned.
- Current source hashes before edits:
  - `work/src/shared/storyboardRewrite.ts`: `bcc6fb6b879df5420d07d5f97ff7c04d012cf8a70cb3cb27f3c994197bc15d51`
  - `work/src/shared/storyboardRewrite.test.ts`: `382c6512c0adcb988b1f3fbced927d7dd9f13471a117f5fb6f01193005fb4062`
  - `work/src/renderer/src/AppNext.tsx`: `5f992599e0d9706ee977f0da7ccba7b12f043c7745a48106f14779732d285ee4`
  - `work/src/renderer/src/UtilityNodes.tsx`: `58c9389f51e667938aaf28edce52e237f0adb018506844dfb973800bd225a5f5`
  - `work/src/renderer/src/styles-next.css`: `beb9fec742d233b46dfc4b80fabe53889e804bcaeda10fe2ea8e59d6e370435e`
  - `work/src/renderer/src/productSurface.test.ts`: `22f3662b44fbaac69d379dead1fc93dad4a783886f16e8e91625446edfba38d4`

## Scope
- In scope:
  - a pure, provider-safe Storyboard Connected Context Manifest derived from connected Character, Location, Element/Prop, Style, and ordinary image/reference authorities;
  - reuse of existing stable Canvas tags/anchors where available, safe display metadata and weak filename aliases only, deterministic authored-tag suppression, ambiguity/no-guess behavior, and provider-output validation;
  - the smallest generic Storyboard Image Reference connection needed for already-connected ordinary image authorities to participate, reusing the existing `@asset-name` Canvas tag contract and never creating visible ordinal reference tokens;
  - Revamp Shot and Revamp All instruction/wiring, including skipping complete structured prompts unchanged;
  - removal of only the active Storyboard compiled-sheet Play/generate control and its Storyboard-local readiness wiring;
  - focused behavioral/product-surface tests and this impact record;
  - canonical Storyboard documentation for the current text-only surface and a clearly labeled Deferred future image-generation/selectability contract.
- Out of scope:
  - legacy `src/renderer/src/App.tsx` and `src/renderer/src/styles.css` (do not inspect or edit);
  - Video Generator or any unrelated node Play/generation control;
  - provider/main/preload API redesign, credentials, provider discovery, live model probes, live inference, or paid calls;
  - Storyboard image-generation switch, image-selection state, new persistence schema, hidden mode, migration, or provider call for the deferred behavior;
  - changes to Cut/Continue, SHOT/BEAT/HARD CUT, timing, dialogue, locks, continuity, camera metadata, or smooth-prose contracts;
  - Git branches, worktrees, commits, pushes, replacement tasks, or structural/Obsidian/Google Drive mutations.
- Files allowed to change:
  - `work/src/shared/storyboardRewrite.ts`
  - `work/src/shared/storyboardRewrite.test.ts`
  - `work/src/shared/nodePorts.ts`
  - `work/src/shared/nodeConnections.ts`
  - `work/src/shared/nodeConnections.test.ts`
  - `work/src/renderer/src/AppNext.tsx`
  - `work/src/renderer/src/UtilityNodes.tsx`
  - `work/src/renderer/src/NodeCardNext.tsx` only if removing the unused Storyboard runtime contract requires it
  - `work/src/renderer/src/productSurface.test.ts`
  - `docs/features/nodes/workflow/storyboard/storyboard-node.md`
  - this impact record.

## Dependencies
- Feature/node: Storyboard panel Revamp Shot / Revamp All and the active next-generation Storyboard editor.
- Architecture/runtime boundary: connected Canvas graph -> pure renderer/shared manifest -> hidden assistant instruction -> selected text provider -> deterministic renderer-side output validation.
- API/provider: existing `PrismAPI.assistant.rewrite` contract only; the manifest is embedded in the provider instruction and never shown in the authored prompt. No provider endpoint or request schema changes.
- Authentication/authorization: no credentials or provider tokens enter the manifest; no new authorization surface.
- Contract/schema: generic Storyboard `reference-in` reuses existing image signal and `@asset-name`/`workflowTag` semantics; no new visible ordinal token family or persisted schema.
- Persistence/data: no migration or data-shape change; complete structured panel prompts remain byte-for-byte unchanged.
- Design: remove only the active Storyboard red compiled-sheet action; retain Storyboard Save, Revamp Shot, Revamp All, Cut/Continue, timing, and panel controls. Generator Play remains untouched.
- Tests/release: focused shared/graph/active-renderer tests, TypeScript, one production build, one fresh arm64 Flight Tester package/open; no full suite, provider call, ASAR/hash/signing/audit, or live UI inspection.

## Protected behavior
- Existing semantic tags and authored prompt text remain deterministic and preserved.
- Complete structured prompts are not rewritten.
- Only connected references may be introduced by Revamp; authored tags cannot be removed or duplicated, unconnected tags and raw `@ImageN`/`@VideoN`/`@AudioN` tokens are rejected, and hidden manifest narration is rejected.
- Typed semantic roles remain authoritative; an ordinary image may never be promoted to Character, Location, or Element/Prop by filename inference.
- Cut/Continue sequence grouping, SHOT/BEAT/HARD CUT compilation, timing, dialogue, locks, continuity, camera, and smooth-prose behavior remain unchanged.
- Storyboard remains a text-only planning node in the active UI; prior compiled-sheet behavior is retained as historical/deferred knowledge only.
- Video Generator and unrelated node Play/generation controls remain unchanged.

## Migration and rollback
- Data/schema change: none; the generic image input uses the existing typed image signal and stable Canvas tag contract.
- Backup/restore proof: the accepted working tester remains untouched until the replacement is source-gate green, packaged, and opened.
- Surgical rollback set: restore the listed source/test files and canonical Storyboard document to the pre-change checkpoint; remove only the new context/graph tests and revert the generic Storyboard input/readiness removal. Preserve all unrelated working changes.

## Verification
- Targeted tests:
  - connected-context manifest generation and authored-tag suppression;
  - ordinary Image/Element inclusion, safe metadata, no paths/secrets/ordinal tokens, ambiguity/no-guess;
  - complete structured prompt preservation and provider-output validation;
  - Storyboard generic Image Reference graph compatibility;
  - active Storyboard surface absence of Play with Revamp/Cut/Continue and Video Generator Play retained.
- Cross-boundary regression tests: current Storyboard Rewrite, Storyboard Sequence, workflow resolver/shot-spec, node connection, and active product-surface tests as directly affected.
- Typecheck/build: `npm run typecheck`; one `npm run build` after source edits.
- Package/open: one fresh `/tmp` arm64 `Prism Flight Tester` candidate; preserve the current tester until final handoff, then quit/replace only once the replacement is ready and open it once.
- Physical UI/provider/release checks: user-owned after opening; no provider/inference call, selector/model inspection, screenshots, AX/DOM/computer_use, full-suite run, signing, audit, hash/readback, or promotion.
