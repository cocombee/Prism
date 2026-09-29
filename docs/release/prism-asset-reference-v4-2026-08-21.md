# Prism Asset and Reference Upgrade — v4

> **Attempted:** 2026-08-21
> **Checkpoint:** `2026-08-21-prism-asset-reference-v4`
> **Status:** Demoted after independent audit; never use as a promotion parent
> **Superseded visual finding:** The bounded 16:9 observation below is retained only as historical v4 evidence. Current product contract requires ordinary terminal media to retain its natural rendered aspect ratio inside a locally rounded/clipped wrapper.

## Candidate scope

1. Imported media filenames are normalized to lowercase, including extension case. UUID-backed physical names remain collision-safe, and manual renames now obey the same lowercase rule.
2. Media-node images use one bounded 16:9 viewport with `object-fit: contain`; the verified square source rendered completely inside a 313 × 176 stage instead of overflowing the node.
3. Image media routes to the Image Generator reference input and prefers the Video Generator `reference-in` handle. Provider-specific input validation remains authoritative.
4. Character intake now exposes two explicit modes:
   - `Character Sheet` — one complete ready-made sheet.
   - `Multi-angle Images` — the existing labeled angle slots.

## Additional startup repair

A slow or stale Recent Project path no longer blocks the valid active project from opening. Recent Project manifest probes are bounded and the successor renderer hydrates the active studio independently while Recents load in the background.

## Verification correction

- The historical run reported 62 files and 545 passing tests, but 116 accumulated product-surface checks read inactive legacy renderer files. That evidence did not validate the packaged successor UI.
- Remediation retargeted the accumulated suite to `AppNext.tsx`, `NodeCardNext.tsx`, and `styles-next.css`; 117 focused active-renderer checks pass. Full release gates remain required before any replacement candidate.
- Remediation full source gates now pass 63 test files / 548 tests, TypeScript, production build, and `npm audit` with zero vulnerabilities. These gates do not rehabilitate the demoted v4 package.
- TypeScript: passed.
- electron-vite production build: passed.
- npm audit: zero vulnerabilities.
- Signature evidence is inconsistent: an independent audit observed `invalid signature (code or signature have been modified)`, while a later Hermes check returned exit 0. The candidate is disqualified regardless of the later result.
- Live launch: 1 canvas, 4 assets, 6 nodes.
- Character editor displayed both new labels.
- Project `assets.json`, `workflow.json`, and project manifest remained byte-identical to the pre-test hashes.
- Root `Prism Foundry.app` has been restored to `outputs/build/mac-arm64/Prism Foundry.app`.

## Safe state

The valid fallback at `outputs/build/mac-arm64/Prism Foundry.app` is the active launcher target and only approved runtime. Do not parent work from v2, v3, or demoted v4.
