# Prism Source Promotion Provenance

> **Status:** Approved runtime promotion

- Historical source: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Codex/AI Video/Magnific Style Software/work`
- Canonical Hermes destination: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/work`
- Excluded generated/dependency trees: `node_modules/`, `out/`, `.git/`
- Current Prism project remains at `/Users/mrkokom/My Drive (cocombees@gmail.com)/AI Video Projects/003. Misi Delivery/00. Prism`.
- Existing Electron `userData` identity and encrypted provider credentials remain in place and were not inspected or moved.
- Rollback evidence is the immutable file-hash manifest in `MANIFEST.json`. The imported source remains an unapproved build parent because its inherited tests and typecheck fail; the unchanged packaged runtime is approved independently by exact artifact parity, signature verification, launch, and asset readback.

## Approved launch surface

- Single-click task-root launcher: `Prism Foundry.app`
- Physical Hermes application: `outputs/build/mac-arm64/Prism Foundry.app`
- Retained package: `outputs/Prism Foundry macOS arm64.zip`

The imported source baseline is preserved under `work/`, but it is not the approved runtime parent because its inherited state has 28 failing tests and seven TypeScript errors. The promoted packaged app is byte-for-byte identical to the previously working artifact and is the only approved launch surface for this migration.
