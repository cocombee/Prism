# Prism Foundry

Prism Foundry is a standalone, local-first macOS visual workflow studio for generative image and video work. Its node-canvas interaction is inspired by modern creative workflow tools, while its visual identity, implementation, and branding are original.

## Included workflow nodes

- Prompt
- Local media import
- Image generation
- Image editing
- Image upscaling
- Video generation
- Gallery/output collection

The canvas supports typed connections, zoom and pan, a minimap, node search, inline parameters, run progress, persistent workflows, generation history, and a non-destructive local media library.

## fal.ai models

Model IDs were verified against the official fal.ai API pages on 31 July 2026:

- `fal-ai/flux/schnell` — text-to-image
- `fal-ai/flux-pro/kontext` — prompt-based image editing
- `fal-ai/clarity-upscaler` — image upscaling
- `fal-ai/kling-video/v3/standard/text-to-video` — text-to-video

## Security model

- The renderer runs with Node integration disabled, context isolation enabled, and Electron sandboxing enabled.
- The fal.ai key is encrypted using Electron `safeStorage`, which uses macOS-backed secure encryption.
- The renderer can only invoke narrow IPC methods exposed by the preload bridge.
- `@fal-ai/client`, credential decryption, local file upload, queue handling, and output downloads run only in the trusted Electron main process.
- Local input files are copied non-destructively into the app library. Only app-library files can be uploaded by generation requests.
- Generated media is downloaded into the local library before it is displayed in the workflow.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Personal-use DMG

```bash
npm run dist:mac
```

The current build targets Apple Silicon (`arm64`). It is intentionally unsigned for personal use. Public distribution requires an Apple Developer ID certificate, signing, notarization, and explicit authorization from the certificate owner.
