# Node System

> **Status:** Current

`NodeKind`, `StudioNodeData`, ports, signals, defaults, resolver behavior, renderer components, and tests form the executable node contract.

## Families

- Prompt and media input
- Semantic assets: Character, Element, Location, Style
- Workflow: List, Router, **Storyboard**
- Generators: Image, Video, Upscaler, Voiceover, Sound Effects
- Output and canvas utilities
- Compatibility/retired kinds retained by migrations

A node feature may not change shared ports, request assembly, persistence, or sibling defaults without an explicit cross-domain impact map.
