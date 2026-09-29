# Runtime Boundaries

> **Status:** Current

## Main process
Privileged owner of credentials, filesystem operations, dialogs, provider network calls, project state, downloads, and the `prism-asset` protocol.

## Preload
Typed capability bridge only. It exposes projects, credentials, services, workflows, assets, assistant, generation, history, and experiments.

## Renderer
Untrusted presentation boundary. It must not receive raw API keys or direct filesystem privileges.

## Shared
Pure types and behavior used to keep node ports, request assembly, model capabilities, migrations, and tests consistent across runtime boundaries.

Any new privileged operation requires: typed API contract, preload exposure, validated main handler, authorization/path checks, error contract, and tests.
