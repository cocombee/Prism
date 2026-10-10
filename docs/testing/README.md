# Testing and Verification

> **Status:** Current

Prism uses Vitest plus TypeScript typecheck, production build, packaged-app inspection, and physical UI/provider verification. The test suites span main safety, shared contracts, request compilation, nodes, renderer product surfaces, persistence, recovery, and Storyboard behavior.

A passing local unit test is not enough for cross-boundary changes. Use the affected feature regression matrix, then typecheck/build and physical checks where behavior is visual, billable, filesystem-dependent, or packaged.

## Native test execution

`npm test` runs the non-Electron regression suites. `npm run test:native` runs the separate Electron UI gate, serially with one worker and stop-on-first-failure. Two legacy keyboard-boundary suites belong to the native gate even though their filenames lack `.electron`.

On macOS, restricted shell launches can abort Electron in `_RegisterApplication` before app code runs, generating unexpected-quit dialogs. The native launcher first checks macOS process access without launching Electron. In Codex, native tests require reviewed execution outside the shell sandbox, with their existing temporary user-data fixtures. `npm run test:native -- --check` checks the launch context without opening an app. Passing this preflight does not prove GUI startup; stop immediately if a real native startup fails. Do not retry a crashing batch or disable OS crash reporting.

Both test gates are required for full verification. Report each separately; a passing `npm test` does not imply native coverage. During an unresolved crash-alert incident, keep all native launches stopped and record that gate as pending. Neither command installs or packages an application.
