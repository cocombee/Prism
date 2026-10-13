# Assets Padding Correction

**problem**

Assets uses unrelated literal section/list insets and browser-default close-button padding. User specifies first established padding around sections and list, second padding only between buttons and rows, including full bottom inset at maximum scroll.

**owners**

[
  "work/src/renderer/src/styles-next.css",
  "work/src/renderer/src/iconSystem.ts existing Lucide header icon family",
  "work/src/renderer/src/AppNext.tsx existing Assets markup"
]

**allowedChanges**

[
  "work/src/renderer/src/styles-next.css",
  "work/src/renderer/src/canvasAssetsInsets.electron.test.ts"
]

**tokens**

{
  "firstGeneralInset": "var(--node-body-inset), existing12px",
  "secondPeerGap": "var(--selector-content-inset), existing8px"
}

**behavior**

Apply the first inset to header, tabs, filters, sticky actions and all four list sides; use second gap between buttons/rows. Prevent rows shrinking so final scroll padding remains visible. Remove close-button browser padding; preserve its17px Lucide glyph and default2 stroke, already identical to the adjacent17px Assets glyph.

**protected**

Existing row thumbnail/content spacing, row dimensions, labels, colors, hover/selection, horizontal tabs scroll, filtering, account/prompt/graph/media state and unrelated side panels. No icon redraw or new visual values.

**verification**

Actual CSS in isolated Electron at wide/narrow viewport, list top/max-bottom, first/last tab scroll, action variants and header icon stroke parity; affected product/icon tests; typecheck; one build and same-slot stable-signed install/open.

**parent**

Verified reinstalled ASARd24c7140b28216bedacd564a5370aed3810e6938094d3e5970b68a014e4b6b7e; Git304c6ae already pushed. This new correction is separate uncommitted source work.

**deferred**

No paid generation, no lip-sync acceptance claim, no new Git action inferred after the authorized304c6ae push. Wider audit remains active.
