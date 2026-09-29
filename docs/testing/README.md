# Testing and Verification

> **Status:** Current

Prism uses Vitest plus TypeScript typecheck, production build, packaged-app inspection, and physical UI/provider verification. The source currently contains 60 test files spanning main safety, shared contracts, request compilation, nodes, renderer product surfaces, persistence, recovery, and Storyboard behavior.

A passing local unit test is not enough for cross-boundary changes. Use the affected feature regression matrix, then typecheck/build and physical checks where behavior is visual, billable, filesystem-dependent, or packaged.
