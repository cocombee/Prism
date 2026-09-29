# Source Decomposition Risk

> **Status:** Current risk; refactor not yet approved

Large concentration points include the active successor files `AppNext.tsx`, `NodeCardNext.tsx`, and `styles-next.css`, plus `src/main/index.ts`, `types.ts`, and their protected legacy predecessors. Documentation boundaries do not imply those files can be split safely without tests.

Documentation also retains a major concentration point: `docs/design/visual-and-interaction-standard.md` is approximately 101 KB. Its size is acknowledged debt, not evidence of completed decomposition. Any future split must preserve every normative clause through an exact inventory test and must be reviewed before another application promotion.

Any source decomposition must be behavior-preserving, test-first, one-dimensional, and independently reversible. Extract one ownership boundary at a time and keep the last verified source/build as rollback parent.
