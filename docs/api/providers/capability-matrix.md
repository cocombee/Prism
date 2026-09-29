# Provider Capability Matrix

> **Status:** Current; executable registries and adapters override prose

| Provider | Current Prism use | Authentication |
|---|---|---|
| fal.ai | image, video, audio, any-LLM assistance, model routes, billing state | API key |
| BytePlus ModelArk | direct ByteDance Seedance video generation with account-activation-aware model availability | API key; encrypted multi-account profiles |
| Fish Audio | direct TTS | API key + voice reference ID |
| OpenAI | image generation/editing and prompt assistance | API key |
| Google Gemini | image generation and prompt assistance | API key |
| Anthropic | prompt assistance | API key |
| DeepSeek | prompt assistance | API key |
| Moonshot | prompt assistance | API key |
| ElevenLabs | audio routes currently reached through configured generation paths | provider-dependent |

Capabilities, model IDs, limits, pricing, and request fields must be source-verified and tested before changes. Never copy keys into docs, logs, renderer state, or checkpoints.

## Direct BytePlus Seedance

Prism keeps supported model discovery separate from account activation. The static menu exposes distinct BytePlus Seedance 2.5 and 2.0 families, while the authenticated ModelArk `/models` result is the authority for whether the selected account may run the exact model. An absent activated model remains inspectable but is blocked before paid submission with an Ark activation instruction; Prism never pads a verified live catalog with absent static models and never silently falls back to fal.ai.

| Model tier | Prism resolutions |
|---|---|
| Dreamina Seedance 2.5 | 480p, 720p, 1080p |
| Dreamina Seedance 2.0 Standard | 480p, 720p, 1080p, 4K |
| Dreamina Seedance 2.0 Fast | 480p, 720p |
| Dreamina Seedance 2.0 Mini | 480p, 720p |

Provider errors, progress, account status, history, and outputs retain `BytePlus` identity end to end. A BytePlus activation or quota error must never be relabeled as fal.ai.
