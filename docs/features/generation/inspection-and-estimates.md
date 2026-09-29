# Inspection And Estimates

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/features/generation/inspection-and-estimates.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `SKILL.md` → `Generated media inspection and estimates`

---

## Generated media inspection and estimates

- Generated single-use Image, Video, and Audio results retain prior successful generations. Double-click opens the original full-resolution media in one shared viewer whose outer frame follows the original image/video aspect ratio while fitting the viewport; hover reveals Finder, Rename, Favorite, Delete, Close, and—when history exists—Previous/Next. On a non-maximized node the Previous/Next result control is hover/focus-only. Its pointer and double-click events never bubble into node drag, Focus, or the full-resolution opener; a double-click therefore performs the selected direction twice through its two ordinary click events. Generated media and viewer surfaces suppress native text/image selection and image dragging so double-click never paints a browser-selection tint. Renaming ordinary media renames its managed physical file and rewrites every saved owning path. Deleting a user-owned asset removes its registry/history record and moves its guarded managed physical file to the macOS Trash; collection deletion applies to every owned member. The delete confirmation always layers above an open viewer and slightly darkens the viewer/background beneath it. The viewer footer identifies source inputs, actual media dimensions or duration, model, and local creation date/time. Right-click offers a type-correct Copy action. The same Finder action appears on every user-owned/copyable Assets card in Home and Canvas Assets; built-in Styles expose no file actions.
- In the full-resolution viewer, Close is isolated at the top-left while file actions remain top-right. The metadata strip overlays the image bottom only on viewer hover or keyboard focus and uses exactly `70%` container opacity; at rest it is absent and consumes no image height.
- Cost estimates must be request-shaped and current. Prefer live provider pricing only when it truly accounts for the selected endpoint and options; never substitute a catalog ceiling for a variable-token request estimate. Every fallback records its verification date and exact basis, is refreshed when provider pricing changes, and is reconciled against an authoritative completed-run charge when that evidence is available.
- GPT Image 2 Edit fallback pricing interpolates fal's current high-quality output-size table and treats one input image as included. Preserve the verified incremental allowance only for additional high-fidelity inputs; never convert prompt character count into a guaranteed surcharge when fal documents prompt complexity as variable rather than publishing a deterministic per-character rate.
- Generation countdowns use provider progress first, then recent completed local runs matching model, media type, resolution, duration, quantity, reference count, and audio mode. Weight recent evidence more heavily while keeping the estimate above the slowest completion in the bounded recent window plus a safety margin, so one fast run cannot erase a known underrun. Record the complete user-visible wall time for sequential batches rather than multiplying one provider call by quantity, and preserve actual elapsed milliseconds in History. Static model ranges are deliberately widened cold-start fallbacks only.
