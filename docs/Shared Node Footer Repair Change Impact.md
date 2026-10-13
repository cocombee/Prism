# Shared Node Footer Repair — Change Impact

Status: Implemented, verified and reinstalled as ASARecd4de27bfbf064a0870cebe332d1ea4f4c7b1aaf1d43725556587d59d83ae19. Immediate parent31dbd8e17693e73ff77bc0e3f164b61270fcd70259f5b0d889d8fc8236ab8f1e retained in verified fallback. New Music backend helper remains inactive; compiled main/preload are unchanged. User visual acceptance is pending.

## Problem and intended behavior

The Music proposal reused individual controls but introduced different row preferences and wrappers. Current shared allocation fixes icon width without grouping optional circular actions; native probes reproduce separated icons even when the trailing cluster fits. No-model groups can anchor a shorter field first. Static geometry checks missed those policy violations. The user now specifies the immutable all-node footer contract in design/node-footer-hard-contract.md.

## Owners and bounded slices

- Pure footer-specific row policy and behavioral tests: work/src/shared/footerControlLayout.ts and .test.ts. Reuse existing measured mixed-row primitives; keep generic panel/inspector allocation unchanged.
- Actual renderer seam and footer wrapper: work/src/renderer/src/NodeCardNext.tsx. Explicit model/settings/run/circle ownership; no manual field-row preferences. Permit validated right-aligned icon overflow rows.
- Family consumers: current Image/Video/semantic generators, Voice speech/dialogue/conversion/Fish/fal, Sound Effects, Upscaler/Image Editor, Prompt and Storyboard node footer. Inventory non-generation/non-footer and legacy-only families explicitly. Current music-generator and assistant are migrated by AppNext; do not activate legacy branches or change node migrations merely to repair footers.
- Styles: work/src/renderer/src/styles-next.css. Footer-only general outer inset, small internal gap, no visible field headers, painted-control alignment. Preserve other regions and accepted component anatomy.
- Documentation: authoritative hard contract, affected design reference links, CURRENT-STATE and acceptance evidence.

## Protected boundaries

No provider transport, credentials, billing, paid request, user workflow/media migration or Git change. No authored selector/voice/model/duration values are rewritten. Unset placeholders are presentation, not new provider values. No activation of new Music service/UI. Existing installed application remains unchanged until a verified release transition.

## Verification and rollback

Retain pre-edit hashes/source for changed existing owners. Meaningful RED cases: optional icon cluster separation, longest fallback, title-height offset, layout pressure/long selection, extra-space clearance and outer/internal padding. Run pure focused checks, all current footer component families at375/315/250 and canvas zoom, selection/availability/resize transitions, TypeScript and relevant existing controls tests. Inspect rendered images. Build/package/install, if performed, use the sole same app path, stable certificate and ordinary Quit/reopen; no false all-family or installed claim from source-only results.

## Remaining gates

Source and shared-family validation are complete. Music UI/output and lip-sync fidelity remain unaccepted and independent. Native screenshots and local fixtures do not certify live-provider output. Closed App branches have CSS-owner coverage only. Five baseline-proven body-only notices remain outside this footer repair.

## User-expanded field consolidation

The user expanded this batch to all single-line fields, including Inspector. The paint contract is owned by design/selector-and-discrete-controls.md; multiline sizing/shape is explicitly preserved. Active owners were traced with local CodeGraph CLI and an AST/class inventory. Implementation remains in existing styles-next.css and existing node/shared-field component composition; it does not alter provider callbacks, field types, saved values or transport. Inspector is inline in AppNext and ShutterSettings; no replacement Inspector is introduced.

Shared focused84/84,full3543/3543,TypeScript and one build pass. Final footer matrix28variants/168observations, field116paint/17search observations and Inspector10fields at3widths pass. Seven multiline/exempt specimens match the baseline exactly. Normal Quit, same-slot install and native reopen completed. Installed Image/Video/Voiceover/Storyboard states were observed;19project files stayed byte-exact and one manifest refreshed on existing restore logic. Receipt documents the normalized-manifest comparison limit. Packaging preserves26compiled files,main/preload,8555other entries,17unpacked dependencies,275framework files and5requirements; fallback ZIP is verified and temporary runnable candidate removed. No new provider submission,Git action or Music UI activation. The preview has section-only dividers, six passing cases and remains pending user acceptance.
