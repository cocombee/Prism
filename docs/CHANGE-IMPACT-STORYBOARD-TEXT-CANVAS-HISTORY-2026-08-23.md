# Change Impact — Storyboard Text Selection and Canvas History Runtime — 2026-08-23

> **Status:** Active focused editor/history correction; disjoint from Designer notification audit.

## Scope
- Capture and restore controlled Storyboard textarea selections without moving the caret to the end.
- Preserve native textarea undo/redo by isolating text-history shortcuts from Canvas shortcuts.
- Recognize Meta/Ctrl Canvas undo/redo only outside active text editing.
- Sanitize queued/running runtime presentation from Canvas history snapshots and restores.

## Protected behavior
- Preserve tag suggestions, keyboard selection, overlays, scroll, authored prompts/panels, outputs, locks, layout, terminal errors, and unrelated UI/status/CSS.
- Do not touch `productSurface.test.ts`, notification/category/status CSS, Designer files, legacy source, providers, or live UI automation.

## Allowed files
- new focused shared selection/history helpers and tests
- active `work/src/renderer/src/TaggedPromptTextarea.tsx`
- active `work/src/renderer/src/AppNext.tsx`
- one dedicated renderer contract test if needed
- task-local Developer skill after green
- this impact record.

## Verification
- Strict RED→GREEN helper and dedicated active-source contracts.
- Focused helper, promptTags, canvasInteractions, editor/history contract tests; TypeScript; one production build; one fresh arm64 package/open.
