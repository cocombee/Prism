# Remove Abandoned 3D Camera Tester

Status: Removed at the user’s request on 2026-09-30; local verification passed.

Checkpoint: Git commit `939132fbe845d6878c698179100d6dca66f3eb2b`. The main app source compiled into the same 25 packaged application files as the retained working app.

Scope: Remove the isolated `work/src/camera3d/` and `work/src/camera-tester/` sources and tests, their dedicated Vite/Electron builder configurations, camera-only scripts and old impact notes, and unused `three`/`@types/three` dependencies. Update the main foreground test to cover the remaining application stylesheet and remove obsolete documentation references.

Protected: Main application source and behavior, Storyboard camera-support semantics and controls, shared minimap/asset helpers, provider credentials, user project/media files, and the retained working app. No app packaging, launch, promotion, or handoff is part of this cleanup.

Verification: TypeScript check, the foreground regression and existing main camera-support tests, and one isolated production compilation compared against the retained app. Push the removal commit to `cocombee/Prism` and confirm GitHub main has that exact commit.

Rollback: Restore only this change's tracked files from the checkpoint commit; the original source remains available in Git history. Do not overwrite unrelated later work.

## Verification results

- Removed 105 tracked files belonging to the isolated camera project, including its dedicated tests, configurations, scripts, and old impact notes.
- Removed `three`, `@types/three`, and six exclusive transitive packages from the lockfile; no other locked package changed.
- TypeScript passed before and after the removal.
- Six focused test files passed, 24 tests total, including the remaining foreground rule and main camera-support semantics.
- One isolated production compilation passed; all 25 application-owned outputs still match the retained app, with no missing, changed, or additional files. The temporary compilation was removed.
- No current app bundle, user project, media, or credential was changed. No new handoff was created.

## Repository scope follow-up

Checkpoint: `f79571431ad57cb6bac0934539f180548429e312`; GitHub advertises only `main`, with no separate experiment branch or tag.

Scope: remove the abandoned experiment's 75 source-hash entries and obsolete tester configuration fields from the published comparison manifest. Preserve the original comparison timestamp, total input count, main-app output hashes, and dependency/native-payload evidence. Add ignore rules for the removed experiment's source, configurations, scripts, and local abandonment status. State the main application's repository scope in README.

Allowed files: this record, `.gitignore`, `README.md`, and `docs/operations/Source And App Comparison.json`. Protect every implementation file, dependency lockfile, saved project/media/credential, main app, and existing Git history. No compilation, packaging, app launch, or handoff is required for repository metadata changes.

Verification: validate JSON; compare all retained manifest hashes and production-output evidence with the checkpoint; scan the tracked tree for dedicated source/configuration/script/dependency remnants; prove ignore rules cover every removed project file; confirm normal Storyboard camera files remain tracked and all implementation files are unchanged; push and verify GitHub's `main` SHA. Rollback restores only these four metadata files from the checkpoint.

Follow-up verification passed: only the four allowed metadata files changed; all implementation and lockfiles remained unchanged. The tracked main tree contains no dedicated experiment source, tester, configuration, scripts, or dependencies. All 105 previously removed paths match the new ignore rules, while normal Storyboard camera files remain tracked and unignored. The comparison JSON retains the same 355 main-app input hashes and all 25 production-output records. Git whitespace validation passed. No redundant build or runtime test was run for this metadata-only change.
