# Hermes Runtime Promotion — 2026-08-21

> **Status:** Verified

## Last verified checkpoint

- Documentation checkpoint: `.hermes/checkpoints/2026-08-20-prism-branched-v2.1`
- Runtime checkpoint: `.hermes/checkpoints/2026-08-21-prism-hermes-runtime-v1`
- Historical packaged runtime SHA-256 values:
  - `app.asar`: `e6637e0023bc606a65d6f8fdf060082fee57e0821d7971bebfbf90d131662cc4`
  - executable: `ee41e155baab66055788b1b9680c9855f3c49f4d3e7f1026ba0c99e71bed6fab`
  - ZIP: `d7b307789c7ca9ce4a3c10231a28394abd19d88234715daf97bb92520b16775c`

## Scope

- In scope: promote Prism source and the previously working packaged macOS runtime into the canonical Hermes Google Drive task; preserve existing project, assets, credentials, and app identity; provide a task-root launcher.
- Out of scope: source bug fixes, dependency upgrades, behavior changes, schema migration, signing, notarization, and relocation of project assets.
- Changed surfaces: `work/`, `outputs/`, task-root `Prism Foundry.app` symlink, import provenance, and current-state documentation.

## Dependencies

- Runtime boundary: Electron bundle identity remains `com.cocombees.prismfoundry` version `0.1.0`.
- Persistence: current project remains `/Users/mrkokom/My Drive (cocombees@gmail.com)/AI Video Projects/003. Misi Delivery/00. Prism`.
- Authentication: encrypted provider credentials remain under the existing Electron `userData`; values were not read or copied.
- Contract/schema: no schema change.

## Protected behavior

- Existing project opens automatically.
- Existing workflow, nodes, canvases, provider connections, and asset paths remain available.
- No Codex path may appear in the running executable path.
- No asset or project folder may be copied, moved, or rewritten as part of source promotion.

## Migration and rollback

- Source promotion copied 161 non-generated files with zero missing, mismatched, or extra files.
- `node_modules/`, `out/`, and `.git/` were not imported as active source authority.
- The packaged app and ZIP were promoted byte-for-byte into Hermes.
- Rollback is to quit the Hermes app and restore from the retained Hermes ZIP or the recorded source artifact hashes; the external project and Electron `userData` remain untouched.

## Verification

- `npm ci`: passed; 449 packages; zero vulnerabilities.
- `npm audit --audit-level=low`: passed; zero vulnerabilities.
- Imported source baseline: 509/537 tests passed, 28 failed; typecheck has seven inherited errors. No new build was promoted.
- Packaged bundle parity: 125 entries, zero missing/extra/mismatched.
- `codesign --verify --deep --strict`: passed.
- Gatekeeper assessment: rejected because this artifact is not Developer ID signed/notarized.
- Live executable path: Hermes `outputs/build/mac-arm64/Prism Foundry.app`.
- Live acceptance: project `00. Prism`, five nodes, one canvas, four assets, zero missing asset paths.
- `workflow.json` and `assets.json` remained byte-identical after launch.
- The portable project document was normally refreshed and matches the active workflow and all four asset IDs.
