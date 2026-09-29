# Change Impact — Special Asset Batch Intake — 2026-08-22

## Last verified checkpoint
- Checkpoint ID: focused-special-asset-batch-2026-08-22
- Source hashes: `assetBatch.ts` 9a9f36af; `assetBatchInspection.ts` b5385309; `types.ts` af240893; `preload/index.ts` a9692fee; `main/index.ts` 686f3ceb; `AppNext.tsx` 0f0790ab; `NodeCardNext.tsx` 28804460; `styles-next.css` c227b0d4.
- Passing verification: 164 focused tests and TypeScript typecheck.

## Scope
- In scope: Add Batch beside Multi and Sheets for Character, Element, and Location; stage two or more valid image sheets; local view and duplicate checks; explicit insertion confirmation; staged rename/delete/save rows; individual and Save All library promotion; saved Batch assets route to Sheets; Sheets imports retain source filenames.
- Out of scope: Style, Storyboard, providers, generation behavior, release promotion, signing, notarization, and physical UI testing.
- Files allowed to change: Batch helpers/tests, Character image inspection, shared types, asset IPC, affected renderer surfaces/styles/tests, and this impact note.

## Dependencies
- Feature/node: Character, Element, and Location reusable special assets.
- Architecture/runtime boundary: Renderer staging → preload IPC → trusted main-process Sharp inspection → managed asset import on explicit Save only.
- API/provider: None.
- Authentication/authorization: None.
- Contract/schema: Optional `locationInputMode`; Batch inspection types and two local asset IPC methods.
- Persistence/data: Staged files are not persisted. Saving imports one managed sheet asset with Sheets-mode metadata.
- Design: Existing special-asset tabs, Character Sheets dashed drop target, side-library visual language, and standard confirmation modal.
- Tests/release: Shared staging, main-process local inspection, product surface, Character validation, renderer behavior, and asset interaction.

## Protected behavior
- Existing behavior that must remain unchanged: Multi and Sheets selection, exact reusable-asset identity, selector deployment, duplicate-node independence and placement, existing Character/Element view intake, and Style prompt-only behavior.
- Sibling nodes/surfaces at risk: Character and Element editors, Location editor, semantic selectors, Canvas image drops, and managed semantic library grouping.

## Migration and rollback
- Data/schema change: Optional additive fields only; missing values continue to normalize to Multi.
- Backup/restore proof: No staged Batch data is persisted and no existing project data is rewritten by opening Batch.
- Surgical rollback set: Remove `assetBatch.ts`, `assetBatchInspection.ts`, Batch IPC/type additions, Batch renderer state/surfaces/styles, and the focused Batch tests; retain unrelated existing source.

## Verification
- Targeted tests: 164/164 passed across Batch staging/inspection/surface, Character image validation, renderer behavior, product surface, and asset interaction.
- Cross-boundary regression tests: Renderer source contract confirms preload/main IPC and save routing; main inspection test exercises Sharp locally with single, distinct, duplicate-file, and repeated-panel sheets.
- Typecheck/build: Typecheck and the final production build passed. The arm64 Flight Tester packaged successfully at `/tmp/prism-batch-tester/mac-arm64/Prism Flight Tester.app`.
- Physical UI/provider/release checks: Flight Tester was opened once. Physical interaction and release-level gates were intentionally excluded under the focused verification SOP.
