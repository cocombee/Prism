# Retention Trash And Deletion

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/data/retention-trash-and-deletion.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `product-contract.md` → `Delete behavior`

---

## Delete behavior

- Canvas, Page, and Asset/Preset deletion always use the shared confirmation dialog.
- Name the exact target and consequence. Deleting a user-owned asset removes its registry/history entry and moves its guarded managed physical file to the macOS Trash; deleting a reusable collection applies to every owned member. Canvas/Page deletion warns that saved deletion cannot be undone.
- Before deleting a Library or Canvas Assets item, inspect every Canvas and Page. If it is in use, the dialog says how many Canvas instances will be affected and uses the standard consequence: deleting the asset removes every instance from all Canvases and Pages in the project. Confirmation prunes those nodes, incident edges, embedded List/Storyboard uses, generated-result references, active Page state, inactive Page snapshots, and inactive Canvas snapshots as one transaction. No in-memory page/cache copy may restore a deleted asset after navigation.
- Include `Don't ask again for this category this session` beneath the warning.
- Store suppression in memory only, separately for Canvas, Page, and Asset. Restarting the app restores all confirmation prompts.
- Keep built-in styles outside all delete paths.
- Inline Canvas asset-name editing owns its complete hit area beneath the hover toolbar. The toolbar pointer bridge stops before the name, the name retains the text/edit cursor, and pointer/double-click events inside the name, rename popover, or toolbar never invoke React Flow Focus, Fit, recentering, or node repositioning. Double-click Focus remains available only on non-interactive node content.
