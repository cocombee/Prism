# Change Impact — Director Filmic Motion Parity — 2026-08-26

## Ownership and scope

- Director owns the exact Bare Prompt wording and cinematic semantic intent.
- Developer owns the Prism implementation, deterministic compilation, tests, build, and package.
- Admin owns this reconciliation record, canonical links, approved mirrors, hashes, and rollback references.
- This document records the verified Developer implementation. It does not modify implementation source or copy Director semantic ownership into Prism.

Shared Director contract and fixture:

- `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Director/docs/director-knowledge/output-branches/parity/CONTRACT.md`
- `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Director/docs/director-knowledge/output-branches/parity/FILMIC-MOTION-24-24-180-VERIFICATION.md`

## Implementation provenance

- Developer session: `20260826_001822_446b1f`
- Canonical source: `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Prism/work`
- Handoff alias: `/tmp/prism-work` → canonical source.
- Package: `/tmp/prism-director-filmic-motion-parity-tester-20260826/mac-arm64/Prism Flight Tester.app`
- Package executable: Mach-O 64-bit arm64.
- Executable SHA-256: `1af684f056a8eb13e49fbd677072e437316086b076e3b9b92de3ddb343edc5b1`.
- `app.asar` SHA-256: `85caa6ef0cde5d859a9242ed6dfe5c55b0efddc50cd83558225ced3f08c93d19`.
- The source tree has no available Git repository metadata at this path; no commit SHA is claimed.

## Exact implementation file hashes

| File | SHA-256 |
|---|---|
| `src/shared/filmicMotion.ts` | `64d27428ef963acd06cb506272eef30ce6e1ea753504c495d47c17452295ea2a` |
| `src/shared/filmicMotion.test.ts` | `14a9b981edad1b1e7be95ac22e9978bc5de40b7280813ff5616e77a90ea0d9d7` |
| `src/shared/shotSpec.ts` | `01124b9c248d1810cda86fc5d0f6577dc3159e4d3e9f01616db0c1c07acc48a6` |
| `src/shared/shotSpec.test.ts` | `6e1da01bf983b71ab0b53b0afd6db7bcb8b969fd132cc33bcb3dbd3441d1bc56` |
| `src/shared/providerShutter.ts` | `7551eff419a479b859dfcbbc473cbad863b7b28855ee2d3741449e30761fb0e2` |
| `src/shared/providerShutter.test.ts` | `cdd57b240144de66b8ee93bf9a688d34e6c98bd1412ceef22c9dc71d992b7d52` |
| `src/shared/referenceInstructions.ts` | `ee1ba54413bd8b861c98c03db1605294c952cde55b7608f57ff6767de50bf036` |
| `src/shared/seedanceDirectorCompletion.test.ts` | `46be4fe6df56c8299375cd53eb1195f95f82b018056494121fcb1351b9876946` |
| `src/shared/videoModels.ts` | `366c26f2fb2bab8f91ebffd817be4f5f1fac4161b86543a97db650a71b4514cd` |
| `src/shared/videoModels.test.ts` | `a18be5d0a93d48712f3e0986b39dbd59bde7c168f609115cb9414e403bf12d8a` |
| `src/renderer/src/AppNext.tsx` | `ee4913133458b57e978a6a09b58ed7d346e64504fb9b8f3639f9f33cf5cd527b` |
| `src/renderer/src/shutterOutputFps.contract.test.ts` | `4afa1a5a914157b402fbe741f898281dba5314ea4af6842de525af8dbf8bffaf` |

## Deterministic control provenance

- Capture/output FPS: `effectiveOutputFrameRate(model, request.frameRate)` → `knownOutputFrameRate(model, request.frameRate) || request.frameRate || 24`.
- Shutter: selected Prism `shutterAngle`, default `180°`.
- Exposure: `angle / (360 × captureFPS)`.
- Motion FPS remains separate and never drives exposure.
- Output 24 + Motion 16 + 180° resolves `1/48s`, not `1/32s`.
- 100fps + 180° resolves `1/200s`.
- Normal and conformed slow-motion semantics remain distinct; no slow-motion UI, schema, persistence, or execution was added.

## Verification

Developer verification reported 11 discovered focused/neighboring test files and `156/156` passing tests. `projectSafeState.test.ts` did not resolve as a suite; included neighboring suites covered saved-graph/workflow safe-state behavior.

- `npm run typecheck` — passed.
- `npm run build` — passed.
- arm64 electron-builder package with signing disabled — passed.
- The 14 negative terms compile and deduplicate case-insensitively.
- `no motion blur` conflicts with positive shutter; `no ghosting` remains compatible with legitimate directional exposure blur.
- Camera, actor/blocking, lighting, Style, timing/reaction, complete structured prompts, and User overrides remained unaffected as recorded in the shared fixture.
- No provider output/adherence validation, provider call, Revamp call, media call, credential access, or release promotion occurred.

## Provider limitations

- Diagnostic: `filmic-motion-provider-support`.
- Status: `semantic-prompt-only`.
- Native shutter: `native-unverified`.
- Playback cadence: `not-separately-supported`.
- Capture cadence: native-verified only for exact model contracts with native/fixed FPS; otherwise unverified.
- Wan capture FPS is native-verified; shutter remains semantic prompt intent.
- No undocumented shutter field is sent.

## Excluded scope

Do not fix stale generic `5600K daylight key...` or `Photoreal live-action, fine film grain, 8K master.` defaults in this transaction. Natural/living-face anti-plastic-skin work, Prism UI changes, credentials, and provider adherence validation are also excluded.

## Surgical rollback

Restore pre-batch versions of the modified files and remove the two new Filmic Motion files/test contract:

- `src/shared/filmicMotion.ts`
- `src/shared/filmicMotion.test.ts`
- `src/shared/shotSpec.ts`
- `src/shared/shotSpec.test.ts`
- `src/shared/providerShutter.ts`
- `src/shared/providerShutter.test.ts`
- `src/shared/referenceInstructions.ts`
- `src/shared/seedanceDirectorCompletion.test.ts`
- `src/shared/videoModels.ts`
- `src/shared/videoModels.test.ts`
- `src/renderer/src/AppNext.tsx`
- `src/renderer/src/shutterOutputFps.contract.test.ts`

Admin altered no implementation file. Admin documentation/mirror rollback uses the pre-write backup manifest at `/Users/mrkokom/My Drive (cocombees@gmail.com)/Hermes/AI Video/Director/working/admin-filmic-motion-parity/20260826-before/MANIFEST.json`.
