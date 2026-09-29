# Application Map

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/product/application-map.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `product-contract.md` → `Product hierarchy`

---

## Product hierarchy

- Launch into a DaVinci/Illustrator-style project manager with Projects and Recent Projects. New Project and Open Project are actions inside that manager, not a replacement home screen.
- After choosing a working folder, create and preserve `00. Project`, semantic asset folders, Canvas data, and generated Image, Video, and Audio folders. Store the transferable `.prismflow` working file in `00. Project`.
- A project contains multiple Canvases. A Canvas overview card opens that Canvas. Each Canvas contains multiple Pages shown in the bottom page strip.
- Allow Canvas and Page rename, drag reorder with a stable one-step placeholder swap, duplicate where applicable, and confirmed deletion. Drag the actual card while leaving empty frame placeholders; do not show duplicate content or jitter.
- Keep Home and project-side navigation distinct. Opening a project defaults to Canvas. The project sidebar uses Title Case and orders Canvas first, Assets second with its indented categories directly beneath; Favorites is the final regular-weight Assets subitem after Audio, Uploads does not exist, and Trash remains separate.
- Autosave changed workflow state only on a one-minute cadence. Opening or hydrating a project remains green icon-only `Saved`; React Flow measurement, selection, focus, background normalization, and programmatic viewport restoration are runtime state and never create a false dirty mark. Every real persisted Canvas mutation—including node/edge/content changes, authored text, pointer-driven pan/zoom, and explicit Fit—immediately switches the shared header control to the earlier subtle-delete red `Unsaved`. Clicking that control performs an explicit manual save without changing the automatic cadence rule. `Unsaved` expands briefly for two seconds after the first real edit, amber `Saving…` stays expanded only while the write is actually in flight, and the earlier connected-settings green `Saved` stays expanded for two seconds after success; otherwise the same control collapses to its colored save icon only. Every transient label sits immediately to the right of the icon in the project-name topbar font size with regular `400` weight. Use a user-action gate, identical bordered geometry, and a mutation version so background hydration never dirties the project and edits made during an in-flight save return to `Unsaved` instead of being falsely marked saved. Schedule the automatic checkpoint against the timestamp of the last actual save so continuous editing cannot defer persistence forever, but never perform automatic workflow writes more than once within 60 seconds. Keep the top-right Delete and Settings controls neutral like History; connection state never recolors Settings green, and Delete becomes red only inside destructive confirmation/context surfaces.
