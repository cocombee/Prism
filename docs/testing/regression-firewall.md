# Regression Firewall

> **Status:** Required contract baseline — mixed Current/Proposed/Historical. Confirm each clause against executable source and tests before implementation.
> **Canonical owner:** `docs/testing/regression-firewall.md`
> **Migration rule:** Normative content below is preserved verbatim from the imported Prism baseline until reviewed against executable source and tests.

## Source provenance

- `SKILL.md` → `Convert corrections into regression protection`
- `SKILL.md` → `Verification`
- `SKILL.md:204` → unheaded reusable-correction rule

---

## Reusable-correction rule

When a user correction reveals a reusable failure mode, update this skill or its product contract during the same task, then validate the skill.

---

## Convert corrections into regression protection

- Treat the user's repeated corrections as the highest-value product knowledge. Convert each reusable correction into a concise invariant in `references/product-contract.md` during the same task; when it changes how future work must be performed, also update this `SKILL.md`.
- Structure Prism documentation around the application's real ownership and containment boundaries, not a flat list of visible features. Storyboard is a node and therefore belongs under the node branch, while shared renderer, Electron-main, persistence, graph, provider, asset, testing, and release systems remain separate cross-node branches.
- Before implementing any feature, write a bounded impact map naming the owning node or subsystem, shared code paths, persisted data, provider/request effects, protected neighboring behavior, and required regression tests. Do not edit until the map shows how the change avoids breaking unrelated accepted behavior.
- Before editing an already-working surface, inspect and baseline the accepted behavior, adjacent controls, event lifecycle, persisted state, and existing tests. Preserve every unrelated working path.
- Fix the shared root cause with the smallest coherent change. Do not replace, reorder, restyle, or reroute accepted behavior merely because nearby code is being touched.
- Every repaired regression gets a focused automated test that reproduces the failure sequence and protects both the corrected behavior and its release/cancel/negative path. Maintain a regression ledger in tests: when a previously fixed defect recurs, add a structural or behavioral guard and visually recheck that exact accepted surface after every adjacent change. Add structural tests for durable catalog, ordering, uniqueness, sizing, and mapping rules.
- A typed-port contract test is incomplete until every distinct React Flow node renderer consumes that shared declaration. Guard the component actually registered in `nodeTypes` against hard-coded partial socket lists, then count every expected socket in the packaged hovered node; a passing shared-contract test alone is never visual proof.
- Interpret the user's instruction `test` as the full accumulated master regression, including every issue the user discovered after a previous test was reported as passing. Run automated, developer-only 15-level request audits and visually deploy every node/state/options surface plus relevant cross-node routes; never reduce `test` to the newly edited feature or automated suites alone.
- Re-run the relevant existing regression suite after every correction, then typecheck, run the full test suite, build, package, and inspect Flight Tester. A passing new test never excuses a newly failing accepted behavior.
- Output-port verification must cover every output-capable active renderer in hover, selection, occupied, and live-guidance states; native drag, plain click, completed-drag suppression, and blank-canvas drop are separate cases. Explicitly assert that Gallery has no source port.
- Storyboard image-layout verification covers legacy defaulting, reversible Multi/Single switching, one effective Single panel, two-to-eight-panel Multi sheet compilation, ratio/size persistence, duplicate/save/load/library/delete behavior, stale-image omission, and downstream reference assembly without a paid call.
- Ordinary-media casing verification uses isolated physical fixtures for fresh import, registered-source return, relist, portable import, relink, and rename. Hash media bytes before and after; inject a transaction failure and prove physical path plus asset index, workflow, history, URLs, and portable document roll back together.
- Ordinary terminal-media geometry verification covers portrait, square, and landscape Image, Video, Upload, and Output media. Assert local rounded clipping and natural rendered aspect ratio, and add negative source/package guards against a forced terminal `aspect-ratio`, `height: 100%`, an Output-specific zero-radius override, or `overflow: hidden` on the whole node shell. A passing test that encodes any rejected geometry is a specification failure and must be replaced rather than counted as regression evidence.
- If live desktop interaction cannot be exercised, state that explicitly and rely on deterministic tests only for what they actually prove; never claim an unperformed interaction passed.

### Learned design-and-test doctrine

- Treat human-visible optical balance as ground truth. Measure painted glyphs and perceptually visible subject pixels, not character counts, transparent source bounds, nominal CSS tracks, or code arithmetic. Compare body mass to body mass, and inspect the exact practical zoom/window state where the user will judge it.
- In the roomy Canvas top bar, add an 8px safety gap beyond the macOS traffic-light clearance before the Prism Foundry brand. Center the project name plus Saved/Saving group inside the actual flexible space between the brand and Magnetic Tools at every roomy width; never center it against equal imaginary window halves. The project name, Saved/Saving, Assets, and History labels share one exact font size. Only the project name is semibold; Saved/Saving, Assets, and History remain regular weight. Node-position toolbar glyphs communicate current state: a locked node shows the closed Lock glyph with the darker pressed surface and highlighted icon, while an unlocked node shows the open Unlock glyph without the pressed state; tooltip wording continues to describe the next action.
- Equalized control rows allocate tracks from the CSS Grid content box, never raw `clientWidth`: subtract left/right padding before gaps and track widths. Audit the first and last control edges across every node kind in the packaged app so no row can silently overflow its node border.
- Test systems, not screenshots in isolation. A correction to one node region, footer, selector, port, preview, menu, or readiness state must trigger a peer audit across every node that uses the same design language, plus selected/unselected, hover/non-hover, connected/disconnected, empty/materialized, enabled/disabled, overflow, cancel, persisted-reload, and responsive states.
- A visual test is incomplete until the packaged Flight Tester is inspected after the final CSS cascade and packaging step. Inspect before/after interaction states, wait for animations and persistence to settle, and reject detached wires, hidden overflow, cropped meaningful pixels, mismatched corners, or controls that are mathematically aligned but optically unbalanced.
- A functional test follows every legal typed path to its provider-effective request without billing. Assemble maximal model-valid upstream graphs, verify every visible option survives exactly once, reject wrong-typed hidden branches, and compare final prompt/reference authority with the Magnific contract. Never invent one impossible graph to claim universal coverage.
- Every user-discovered miss permanently joins the master regression ledger. Add a focused guard for its root cause and negative path, then re-run the complete accumulated visual/function/cross-node suite after adjacent changes. “Tests passed” is never a substitute for rechecking the exact surface that previously fooled the test.

## Verification

1. Run type checking, automated tests, and production build.
2. During development, package only the unsigned internal Flight Tester runtime at `/Users/mrkokom/Library/CloudStorage/GoogleDrive-cocombees@gmail.com/My Drive/Hermes/AI Video/Prism/outputs/build/mac-arm64/Prism Foundry.app`.
3. Before overwriting Flight Tester, fully quit its existing process so no renderer keeps stale hashed asset URLs while the packaged archive changes. After packaging, launch exactly one newly packaged Flight Tester instance and verify its bundled images from that fresh process; raising or reusing the pre-package window is not a refresh.
4. Exercise the changed interaction in Flight Tester, including negative and cancel paths, then hand it to the user for personal testing.
5. Never present, link, send, or describe the internal `.app` bundle as a user deliverable unless the user explicitly asks for it. Report only that Flight Tester was refreshed/opened.
6. Do not refresh or prepare any release build or DMG—and do not call the product finished—until the user has personally completed all testing and explicitly says the app is finished.
7. After that explicit approval, the intended user-facing final deliverable is a DMG. For public distribution, require explicit signing/notarization authorization and Apple Developer credentials.

Selector equalization is a painted-pixel calculation. Measure the longest legal item's glyph ink bounds in the browser's actual rendered font; never substitute character count, nominal advance width, a stretched grid-label box, or the track width already allocated by the prior layout pass.

Selector-row arithmetic uses one coordinate system. When the canvas is zoomed or transformed, divide rendered fixed-control rectangles by the live row scale before combining them with CSS-font glyph measurements and unscaled `clientWidth`; never mix transformed screen pixels with CSS pixels.

For bounded discrete on-node values such as Voiceover Speed and Fish Audio Volume, use the shared application selector with one downward chevron instead of the browser's up/down number spinner. Show multipliers with the multiplication sign, such as `1.2×`. This supersedes the earlier Voiceover native-spinner presentation requirement while preserving the same legal provider values.

When a user correction reveals a reusable failure mode, update this skill or its product contract during the same task, then validate the skill.
