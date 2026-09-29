# Change Impact — Notification Blockers and Storyboard Mention Planning — 2026-08-23

> **Status:** Focused pre-build correction for Designer N-01/N-02 plus user-required whole-sequence mention planning.

## Scope
- Version each newly committed terminal node-progress emission so identical copy receives a fresh 5200ms lifetime without rerender-driven restarts.
- Centralize lifecycle patching so actionable errors clear superseded terminal progress and become explicit persistent error state.
- Apply lifecycle transitions through active `updateNode`, origin-graph patches, and the atomic Storyboard result commit.
- Add one Seedance-aligned sequence mention policy shared by Revamp Shot and Revamp All.

## Protected behavior
- Preserve exact timer state guards, cleanup, notification categories, persistent helpers/readiness, phone tags, selector fallback, native scrolling, caret/history, and one-call atomic Revamp All.
- Revamp Shot reads every ordered sibling as context but applies only the selected panel.
- Exact semantic anchors remain mandatory at every relevant point of use; prose economy never suppresses tags.

## Verification
- Strict RED→GREEN fake-timer/lifecycle and Storyboard instruction/apply tests.
- Focused affected regressions and TypeScript only.
- Snapshot: `/tmp/prism-all-fixes-prebuild-v2.json`.
