# APIs

> **Status:** Current

Prism has two distinct API layers:

1. **Internal desktop API:** typed renderer-to-main `PrismAPI` over preload/IPC.
2. **External provider APIs:** fal.ai, Fish Audio, OpenAI, Anthropic, Google, DeepSeek, and Moonshot.

Do not mix IPC authorization with provider authentication. Provider documents own endpoints/capabilities; contracts own stable request shapes; security owns credentials and trust boundaries.
