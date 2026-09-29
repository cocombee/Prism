# Character mode-isolated persistence and global preview — 2026-08-21

## Scope

Preserve the accepted v11 Character prompt/Play/footer behavior while correcting only the named persistence and preview defects.

## Changes

- Single and Multi saved previews now use the same Multi contact-sheet frame.
- Character members carry `characterInputMode`; hydration keys include mode so Single and Multi Face members cannot overwrite each other.
- Editor panels and readiness derive only from the active mode.
- Switching modes may retain unsaved opposite-mode work internally, but Save compiles and commits only active-mode members; the transaction retires prior opposite-mode managed members.
- Raw source images continue to be promoted/copied into managed Character storage before collection commit. Deleting the source cannot remove the saved Character member.
- Existing `.prismasset` collection export and collection-wide logical rename behavior remain unchanged.

## Verification

- Focused tests: 137/137 passed.
- Full tests: 581/581 passed.
- TypeScript: passed.
- Production build: passed.
- npm audit: 0 vulnerabilities.
- Package/source comparison: 25/25 production files matched.
- Ad-hoc signature: verified.
- Paid/provider generation: not run.

## Artifacts

- Accepted fallback remains `outputs/build/mac-arm64/Prism Foundry.app`.
- User-testing candidate is `outputs/candidates/2026-08-21-character-mode-isolated-persistence-v12/mac-arm64/Prism Flight Tester.app`.
