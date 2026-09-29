# Change Impact — Storyboard Deterministic Connected Tags and Shared Feedback Row — 2026-08-23

> **Status:** Active focused correction; no provider inference or live UI verification is authorized before the final candidate opens.

## Scope
- Extend safe weak phone aliases for typed connected Elements, including `telefon`, `telefon pintar`, `telephone`, and `cellphone`.
- Represent matched aliases and required connected-anchor insertion as structured hidden metadata.
- Deterministically replace the first surviving exact safe alias with its canonical connected tag before existing tag validation; reject a required anchor when neither tag nor alias survives.
- Apply identical enforcement to single-panel and atomic Revamp All validation.
- Give duration guidance and Storyboard status one shared `storyboard-feedback-row` markup/CSS base using the approved node-control height and flex centering, without duplicated geometry declarations.

## Protected behavior
- Typed Element/Image roles remain unchanged; filename aliases never promote an ordinary Image.
- Authored exact tags remain byte-for-byte and suppress hidden insertion; ambiguous connected candidates remain no-guess; unhinted tags remain forbidden.
- Preserve selector startup fallback, catalog isolation, native Storyboard scrolling, duration budgeting, Revamp All atomicity, status ellipsis/reduced motion, feedback order, and 315px geometry.

## Allowed files
- `work/src/shared/storyboardRewrite.ts/.test.ts`
- `work/src/renderer/src/UtilityNodes.tsx`
- `work/src/renderer/src/styles-next.css`
- `work/src/renderer/src/productSurface.test.ts`
- exact canonical Storyboard docs and Developer task-local skill after green
- this impact record.

## Verification
- Strict focused RED→GREEN rewrite/atomic and feedback-row contracts.
- Focused affected assistant/scroll/duration/product tests, TypeScript, one production build, one fresh arm64 package/open.
- No full suite, provider/catalog/inference, live UI automation, ASAR/hash/signing/audit, or promotion.
