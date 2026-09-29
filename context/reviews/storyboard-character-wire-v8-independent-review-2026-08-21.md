# Candidate v8 follow-up independent review — 2026-08-21

## Decision

**Rejected.** Candidate v8 is diagnostic-only, not approved, not promoted, and must not parent future work.

## High findings

1. **Character save does not commit the consuming workflow atomically** — `work/src/main/index.ts:2115-2116`, `work/src/renderer/src/AppNext.tsx:2783-2826`.
   - Registry metadata and hidden sheet can commit before renderer workflow state is persisted.
   - A crash can reopen new registry state with stale node mode/views/sheet pointers or replaced deployments.

2. **Collection deletion races normal workflow saves** — `work/src/main/index.ts:1948-1953,2259-2293`, `work/src/renderer/src/AppNext.tsx:1075-1097,1379-1399`.
   - Deletion uses `projectJsonMutations`, but `workflows:save` bypasses that queue.
   - Competing whole-document writes can resurrect deleted deployments or lose newer Canvas edits; rollback can overwrite a concurrent successful save.

## Medium findings

1. **Storyboard freshness omits upstream/style inputs** — `work/src/shared/storyboardGeneration.ts:8-16`, `work/src/renderer/src/AppNext.tsx:2931-2937,2948-2968`.
   - Connected Style, prompt/reference inputs, or upstream reconnection can change while generation runs without invalidating the completion.
   - Completion can clear `storyboardNeedsCompile` and write captured old `stylePrompt` over newer synchronized state.

2. **Character promotion remains outside the transaction** — `work/src/renderer/src/AppNext.tsx:2764-2783,2827-2829`, `work/src/main/index.ts:2418-2433`.
   - Files are promoted and registered independently before the collection commit.
   - Renderer cleanup is best-effort and cannot run after process exit, leaving partial/orphan records/media.

## Verified accepted portions

- Creator-authored Storyboard panels and stale state survive migration.
- Single registry metadata clears hidden-sheet fields.
- Removed/replaced Character views are retired by the shared plan.
- Dynamic-wire reconciliation preserves compatible roles, disconnects incompatible/surplus edges, and remeasures sockets.
- Review reran 575/575 tests, focused 36/36, and TypeScript successfully.

## Evidence

- Review summary: `/Users/mrkokom/.hermes/cache/delegation/subagent-summary-0-20260821_162921_471025.txt`
- Review transcript: `/Users/mrkokom/.hermes/cache/delegation/live/deleg_bb54b331/task-0.log`
- Candidate manifest: `outputs/candidates/2026-08-21-storyboard-character-wire-repair-v8/manifest.json`

## Stop boundary

The user explicitly said **stop** and then authorized saving required continuity. No repair, rebuild, review, package, launch, promotion, or Obsidian projection is active. Resume only after a new explicit user instruction.
