# Provider API-Key Authentication

> **Status:** Current

Prism authenticates to external AI services with user-supplied API keys. Keys are accepted only through the Connections UI and typed services/credentials IPC methods, encrypted in the main process using `safeStorage`, and decrypted only when main-process adapters call providers.

This is not Prism user authentication. No Prism login, session, or identity token exists today.

Key values must never enter Markdown, checkpoints, telemetry, renderer persistence, or chat.

fal.ai and BytePlus ModelArk support multiple main-process-owned profiles. Non-secret display names, provider identity when available, state, defaults, and official balance/availability metadata live in the profile registry; each key remains in a separate `safeStorage` ciphertext. Disconnect retains the key and blocks use, Reconnect only lifts that blocker, Sign Out removes the key but retains the row, and Delete removes both. Legacy migration removes its old ciphertext only after the replacement profile and registry are durable.

BytePlus account connectivity is not proof that every Seedance model is activated. Prism compares the selected provider-native model ID with the authenticated live ModelArk catalog before submission. Static supported choices remain visible, but an absent activation blocks before paid IPC and asks the user to activate the model in Ark and refresh Connections. No key, bearer header, provider payload, or account secret enters renderer persistence or documentation.
