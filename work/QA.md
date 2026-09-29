# Prism Foundry 0.1.0 — Verification Record

Date: 31 July 2026

## Passed

- TypeScript strict typecheck
- Electron main, preload, and renderer production builds
- Native development window launch
- First-launch empty canvas rendering
- Node creation and inline parameters
- Secure credential modal rendering
- Workflow autosave and restoration in the packaged application
- Renderer bundle contains no fal.ai client or API key environment reference
- fal.ai client, secure credential access, queue subscription, upload, and download logic are confined to the main process
- Runtime dependency audit: zero vulnerabilities
- Packaged Apple Silicon `.app` launch
- DMG checksum verification during mount
- Read-only DMG mount
- Applications shortcut and packaged app presence
- Bundle identifier, display name, version, and ARM64 executable inspection
- Application launch directly from the mounted DMG
- Clean DMG detachment

## Not exercised without user credentials

- Billable live fal.ai inference

The live request path is implemented against the verified official model endpoints and can be exercised after the user securely enters a fal.ai API key inside the application.

## Distribution status

- Unsigned personal-use build: complete
- Developer ID signing and Apple notarization: intentionally not attempted; credentials and authorization were not provided
