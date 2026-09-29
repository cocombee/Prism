# Style Node

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/features/nodes/semantic-assets/style-node.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `product-contract.md` → `Style system`

---

## Style system

- Keep built-in Style Library presets visually distinctive, thumbnail-led, and backed by hidden prompts. Never reveal built-in secret prompts through UI, tooltips, exported metadata, or Custom Style editing.
- A connected Style is provider-effective for every compatible generator family. Image Generator must reinsert the resolved private or custom Style instruction exactly once after graph-level deduplication, including text-to-image and reference-edit routes; a visible Style wire/tag without that instruction in the final provider prompt is a blocking defect. Resolve legacy built-ins by preset ID, canonical tag, or title without materializing their private prompt into saved state, and redact those instructions from the production prompt preview while retaining a non-secret applied confirmation.
- Built-in styles appear consistently in the Style node scroller, Home Assets → Styles, Storyboard style chooser, and Canvas Assets sidebar.
- Built-in Style prompts and thumbnails are private application resources bundled inside the installed app. User-created Style presets are also app-global: store them in the app's private support library so every project can use them, never scaffold or write a project-owned Styles folder, and expose Export as the explicit way to create a transferable `.prismasset` in a user-chosen folder.
- Selecting a built-in Style shows its real bundled thumbnail in the shared large preview, followed by a short public description. Resolve legacy selections from canonical tag or title when `stylePresetId` is absent. The description explains the look without exposing or closely paraphrasing the private built-in prompt; built-in Style Edit, Export, and Delete remain unavailable so no action can expose or mutate the private preset.
- Choosing any existing Style immediately collapses Custom Style, replaces the current Style selection, and restores the dedicated Style edge so Storyboard changes from `Style Required` to `Connected`.
- Built-in styles are not deletable or exportable.
- Every built-in Style is a one-to-one audited pair: its bundled thumbnail and private provider-effective prompt must describe the same medium, line language, palette, texture, lighting, and rendering system. Correcting one preset never rewrites unrelated built-in prompts. Keep each visual language measurably distinct with regression-locked prompt anchors and a unique thumbnail. A built-in thumbnail is a general demonstration and may never reuse a user's saved Character identity. Every head and raised meaningful element remains below a generous top safe zone with visible environmental headroom that survives compact and expanded `cover` crops. The default built-in comic catalog includes `Heroic Panel Comics`, an original grounded-anatomy, four-color offset-print style demonstrated by anonymous adult civilian rescuers in ordinary modest clothing—not a child, superhero, or recognizable costume. Its name, thumbnail, and prompt remain free of existing publisher, franchise, artist, character, signature-costume, emblem, mask, logo, and trade-dress references.
- Put user-created Custom Style saves in a separate `My Preset Styles` section. Custom presets are deletable and exportable as `.prismasset`.
- Derive a custom preset preview from one materialized storyboard output panel when it is an image, or a displayed still frame when it is video. Fall back to its user reference only until an output exists.
- Disable custom preset export until a real local preview is available. Include the user's style prompt in the portable asset, never a built-in prompt.
- Selecting Create Style clears any built-in selection before exposing reference and custom prompt fields.
- Style chooser cards show thumbnails and names in one stable full-width horizontal rail. Wheel, trackpad, and pointer grab-drag scroll it without bleeding outside the node; never add Previous/Next buttons or hover/focus padding that shrinks or shifts the rail.
- A Storyboard requires a Style input; create and connect the same reusable Style node automatically. Change `Style Required` to `Connected` once valid.
