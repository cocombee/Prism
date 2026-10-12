# Provider API-Key Authentication

> **Status:** Current

Prism's media adapters authenticate to external AI services with user-supplied API keys. Keys are accepted only through the Connections UI and typed services/credentials IPC methods, encrypted in the main process using `safeStorage`, and decrypted only when main-process adapters call providers.

This is not Prism user authentication. No Prism login, session, or identity token exists today.

Key values must never enter Markdown, checkpoints, telemetry, renderer persistence, or chat.

fal.ai and BytePlus ModelArk support multiple main-process-owned profiles. Non-secret display names, provider identity when available, state, defaults, and official balance/availability metadata live in the profile registry; each key remains in a separate `safeStorage` ciphertext. Disconnect retains the key and blocks use, Reconnect only lifts that blocker, Sign Out removes the key but retains the row, and Delete removes both. Legacy migration removes its old ciphertext only after the replacement profile and registry are durable.

BytePlus account connectivity is not proof that every Seedance model is activated. Prism compares the selected provider-native model ID with the authenticated live ModelArk catalog before submission. Static supported choices remain visible, but an absent activation blocks before paid IPC and asks the user to activate the model in Ark and refresh Connections. No key, bearer header, provider payload, or account secret enters renderer persistence or documentation.

Revamp can separately select API or Subscription for OpenAI, Anthropic Claude, and Google. Subscription uses the official local clients: Codex app-server ChatGPT authentication, Claude Code claude.ai authentication, and Gemini CLI Google OAuth over ACP. Each client owns its own Prism-specific login profile; Prism never imports another application's token or implements a private provider endpoint. Google account sign-in alone does not prove a paid Pro/Ultra plan; the official client applies account access and quota.

Main persists only billing choice and a non-secret account-identity hash in `prompt-connections.json`, following the existing provider/profile selection. A disconnected or failed subscription remains selected, without retrying an API account. Account, project, mode, model and request ownership are verified before applying text. Cancellation and changed context discard late responses. All Style, Assistant and Storyboard callers share the existing rewrite policies and atomic apply behavior. Media generation remains on its existing API route.

Rewrites run in disposable workspaces with native tools/customizations disabled and reject tool, permission, model-change and incomplete-result events. Administrator client policy remains authoritative. Supported published models are catalog choices, not a promise of subscription entitlement or overage-free usage. No generation/top-up is performed by connection checks.

## Real account acceptance — 11 October 2026

OpenAI's Prism-specific official Codex profile connected to ChatGPT Pro and passed synthetic Shot/All rewrites and an actual installed Storyboard rewrite. Claude was kept free as requested; its official login requires Max/Pro for the Code route, so unavailable subscription access remains selected without an API fallback. Google browser OAuth succeeded, but the Gemini native ACP authenticate call returned -32000; readiness was not fabricated and no Google rewrite was attempted. Account/plan access stays under each official client's ownership. These are bounded acceptance results, not claims that every account or model is available.


## BytePlus console asset authorization — 12 October 2026

A local console-asset link never grants identity rights or bypasses provider moderation. The identity owner performs real-person verification/consent in the official workflow; the selected recipient account must have an eligible Active asset. Prism records the user's explicit console attestation without claiming an Asset API check. Asset-library API access requires AK/SK and applicable account rights; this integration uses existing inference credentials and neither enrolls nor purchases access. No AK/SK or consent agreement is introduced.

Links are bound to the immutable selected BytePlus profile, account identifier and exact source bytes. Generation failure never silently switches account/provider or sends raw portrait bytes after a binding error. A new paid BytePlus run remains separate from previous fal spending authorization. Live authorization and output efficacy require legitimate eligible assets and provider acceptance.
