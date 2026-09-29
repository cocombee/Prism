# Unified Reusable Asset Editing, Intake, And Recovery — Change Impact

Date: 2026-08-21
Status: implementation scope
Baseline: promoted v14 (`63a234e476f4a17ddd75968c8fbd76c94f12c77c0f4a47f80dee4898eb7858a0`)

## User contract

1. Every importable/generatable reusable node uses one Save button for the complete Save → Rename → Save flow. The first click opens one full-width rename row immediately above the bottom tools; the same existing Save button commits it. No second Save button appears next to the name.
2. Opening the name row on first save or after an edit focuses the field and selects all existing text. Enter commits; Escape closes without saving.
3. A Finder or Canvas-asset drop directly onto a reusable node is adopted as that node's semantic type. It must not remain as an ordinary image/video/audio library asset merely because it entered through a drop. Validation precedes semantic mutation.
4. Character's visible `Single` mode label becomes `Sheets`; persisted `single` values remain compatible. Its empty intake is labelled `Add Character Sheets` with the description `Multiple Character Views`.
5. Element gains Character-parity `Multi` and `Sheets` modes. Multi owns the four editable view slots. Sheets owns one editable/deletable image labelled `Add Element Sheets`, with the description `Multiple Element Views`. Saving and generation use the active mode only.
6. Location's image input becomes the Character-style intake card labelled `Add Image or Reference`, with the same plus icon and direct-drop/click behavior.
7. Deleting ordinary or reusable/special assets is recoverable. Undo restores the asset registry, every pruned Canvas/Page reference, generation-history linkage, and each managed file to its original physical folder. Permanent deletion is distinct from recoverable deletion.

## Ownership and invariants

- One managed file has one asset ID. Direct semantic adoption reclassifies/promotes into the target semantic collection transactionally; no ordinary-library duplicate remains.
- Character and Element mode switching never mixes active-mode assets. Legacy missing Element mode normalizes to Multi.
- A saved Sheets asset is one image, not a hidden set of duplicated views.
- Rename/save UI is shared behavior, not separate per-node affordances.
- Recoverable deletion must never depend on the macOS Trash restore API. Files stage inside the project with their original paths recorded until restore or explicit permanent deletion.
- A failed trash or restore transaction rolls back files, assets index, workflow, and history together.
- Canvas Undo remains ordered with graph edits. Undoing an asset deletion restores the full affected project snapshot, not only active-page nodes.
- Built-in styles remain outside delete paths.

## Affected branches

- Product/UI: `work/src/renderer/src/NodeCardNext.tsx`, `work/src/renderer/src/styles.css`
- Renderer state and drop/save/delete orchestration: `work/src/renderer/src/AppNext.tsx`, `work/src/renderer/src/rendererBehavior.ts`
- Shared contracts/migration: `work/src/shared/types.ts`, semantic collection/readiness/view helpers
- Main transactional storage: `work/src/main/index.ts`
- Preload/API declarations: `work/src/preload/index.ts`, `work/src/preload/index.d.ts`
- Tests: renderer/product/successor surfaces, semantic collections/readiness, main deletion transaction, workflow persistence/recovery
- Documentation: node system, semantic asset library, retention/trash/deletion, current state and handoff
- Release: focused/full tests, typecheck, audit, build, packaged-source comparison, signature/hash, one replacement tester

## Verification boundary

Automated checks and runtime launch are preflight only. The user performs final behavior verification and approval.
