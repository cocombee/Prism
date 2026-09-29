# Change impact — Character Multi/Single Play split

Date: 2026-08-21
Status: In progress

## Accepted fallback
- Canonical app: `outputs/build/mac-arm64/Prism Foundry.app`
- Accepted archive SHA-256: `7a525b9f45c313dc4a68326c6547b18765e9a89fbdb6cdb1f644b8b702aa391d`
- Keep physically untouched until the replacement is built and opens.

## Scope
- Multi: hide Character description; Play requires the manual Face anchor and completes only missing individual panels through the existing loop.
- Single: show Character description; Play generates all nine named views as one composite image in one provider request, optionally anchored by the imported image.
- Both modes: identical model → Save → Play footer layout.
- No aspect-ratio selector in either mode.

## Allowed files
- `work/src/shared/characterViews.ts`
- `work/src/shared/characterViews.test.ts`
- `work/src/renderer/src/NodeCardNext.tsx`
- `work/src/renderer/src/AppNext.tsx`
- `work/src/renderer/src/styles-next.css`
- focused renderer/product tests required by the behavior contract

## Protected
- Existing Multi per-missing-view generation loop and view metadata.
- Character persistence transaction and downstream semantic resolution.
- Providers are not run during verification.
- User project data is not modified during build verification.

## Focused gates
- Character prompt unit tests.
- Successor/product surface tests.
- TypeScript.
- Production build and physical app launch.

## Rollback
- Restore only the allowed source/test files from this attempt.
- Reopen the accepted canonical app if the replacement does not build or launch.
