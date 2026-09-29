# Prism System Scope and Naming Rules

Status: Approved baseline for downstream design and implementation
Specification version: 0.1.0
Domain owner: Director
Consumers: Designer, Developer, Admin

## 1. Purpose

Prism is a provider-neutral semantic directing system. It converts creative intent plus validated Director knowledge into an explicit, controllable cinematic direction plan, then renders that same decision as either:

1. a complete self-contained bare prompt; or
2. a structured compilation artifact for a provider adapter.

Prism answers: “Given this narrative beat, emotion, subject motion, duration, references, and platform capability, what directing decision should be used, with what parameters, compatibility rules, endpoint, and hold?”

Prism does not generate media, choose paid services, manage credentials, own the application UI, or replace provider adapters. It describes and compiles directing decisions. Execution remains an external, explicitly approved step.

## 2. Scope boundary and ownership

| Concern | Canonical owner | Prism relationship |
|---|---|---|
| Evidence-backed cinematic semantics | Director, Attribute Breakdown | Prism reads atomic rules and resolves compatible directing decisions. |
| Whole-prompt architecture | Director, Prompt Structure | Prism reads section order and assembly contracts. |
| Reusable Seedance prompt craft | Seedance capability | Prism may compile to it; Prism does not replace it. |
| Provider-specific request fields and transport tokens | Provider adapter / Developer | Prism emits a provider prompt plan; the adapter creates the request. |
| User flows, layout, accessibility, visual states | Designer | UI presents Prism concepts but does not redefine their semantics. |
| Runtime, persistence, APIs, validation, tests, security | Developer | Software implements the contracts in this specification. |
| Project folders, mirrors, Drive/Obsidian, lifecycle and delegation | Admin | Outside Prism’s cinematic domain. |
| Generation, billing and credential use | Execution layer plus user approval | Outside Prism compilation; never implicit. |

### In scope

- semantic triggers and conditions;
- movement, speed, distance, acceleration, stabilization and endpoint decisions;
- shot size, angle, lens, focus, blocking, lighting, physics, performance, transition, timing, audio and look interactions;
- compatibility, contraindication and failure-mode resolution;
- reference/asset authority planning without inventing bindings;
- complete-prompt assembly from a Prompt Structure contract;
- provider-neutral structured output;
- provider-capability-aware compilation diagnostics;
- semantic parity between structured and bare-prompt renderings;
- provenance, evidence count, confidence and counterexamples.

### Out of scope

- media generation or credit spending;
- asset upload, storage or thumbnail management;
- provider authentication, billing, retries or network transport;
- UI styling and navigation decisions;
- project/workspace creation and synchronization;
- model training or automatic promotion of provisional knowledge;
- hard-coded universal look presets such as Kodak;
- unverified current model limits or provider capabilities.

## 3. Authoritative knowledge separation

Prism must preserve the two canonical Director branches:

- Prompt Structure: whole-prompt assembly and compiler section order.
- Attribute Breakdown: atomic directing rules and semantic parameters.

The branches may be retrieved together at runtime but must not be flattened into one canonical table or document. Related records share links by stable knowledge ID; prose is not duplicated across branches.

Raw samples and provisional analysis are not executable Prism authority. A rule becomes selectable only when its `prism_disposition` permits use and its status satisfies the active policy.

## 4. Core concepts and glossary

| Term | Definition |
|---|---|
| `DirectingIntent` | User-authored narrative, emotional and cinematic intent before rule resolution. |
| `KnowledgeRecord` | Versioned metadata envelope for one Prompt Structure or Attribute Breakdown record. |
| `StructureContract` | Ordered whole-prompt assembly contract from Prompt Structure. |
| `AttributeRule` | One atomic semantic directing rule from Attribute Breakdown. |
| `SemanticTrigger` | Narrative beat, emotion, intensity or other condition that makes a rule relevant. |
| `ParameterProfile` | Ranges or choices for speed, distance, timing, curve, stabilization, framing and related controls. |
| `CompatibilityEdge` | A typed relationship indicating that two attributes reinforce, permit or require one another. |
| `Contraindication` | A condition under which a technique should be avoided or must be modified. |
| `AuthorityManifest` | Exact connected references and their typed authority roles; it never invents tags. |
| `CapabilitySnapshot` | Live, time-stamped provider/model controls and limits verified outside Prism. |
| `DirectionPlan` | Provider-neutral resolved directing decision for the complete request. |
| `ShotPlan` | One shot’s framing, movement, blocking, performance, physics, audio, continuity and timing. |
| `TimingPlan` | Duration arithmetic, beat ranges, cut positions, endpoint and reaction hold. |
| `BarePrompt` | Complete ready-to-paste prompt requiring no Prism tags or hidden state. |
| `ProviderPromptPlan` | Structured compilation result suitable for an adapter; not yet a network request. |
| `CompilationDiagnostic` | Error, warning or information item explaining a conflict, omission, downgrade or unsupported control. |
| `SemanticParityReport` | Proof that `DirectionPlan`, `BarePrompt` and `ProviderPromptPlan` express the same directing decision. |
| `ProviderRequest` | Adapter-owned API payload. It is not a Prism domain object. |

## 5. Semantic decision contract

Every resolved directing rule follows this relationship:

`narrative beat + emotion + intensity + movement request + starting/ending shot size + lens/angle + available duration + subject motion + genre/realism → movement profile + distance/framing change + acceleration curve + stabilization + endpoint composition + reaction hold + compatible cut`

A movement label alone is never a complete decision. For example, `push_in` must resolve against emotional function, intensity, shot duration, subject motion, lens, start/end size and whether the move should be consciously noticed.

Each selected rule must expose:

- semantic trigger and matched conditions;
- recommended technique and permitted alternatives;
- speed or duration range;
- acceleration/deceleration curve;
- travel distance or framing change;
- stabilization and motion texture;
- compatible angle, lens, shot size, blocking, lighting and transition;
- endpoint composition and hold;
- contraindications and likely failure modes;
- confidence, evidence count and source/timecode provenance;
- any counterexample that changes application conditions.

## 6. Naming rules

### 6.1 Stable knowledge IDs

Format:

`<branch>.<family>.<semantic-slug>`

Rules:

- lowercase ASCII only;
- dot separates hierarchy; hyphen separates words inside a segment;
- branch is exactly `ps` or `ab`;
- IDs describe semantic meaning, not file location, UI wording, provider or version;
- IDs never change when display labels or storage paths change;
- version is a separate field, never embedded in the ID;
- deprecated IDs remain resolvable and point to `superseded_by` when applicable.

Examples:

- `ps.edited-coverage.section-order`
- `ps.continuous-take.waypoint-assembly`
- `ab.camera-movement.push-in-realization`
- `ab.timing.reaction-hold`
- `ab.reference-authority.semantic-anchor`

### 6.2 Code and schema naming

| Item | Convention | Example |
|---|---|---|
| Domain types | PascalCase | `DirectionPlan`, `CapabilitySnapshot` |
| JSON fields | snake_case | `reaction_hold_seconds` |
| Enum values | lowercase snake_case | `slow_push_in`, `hard_cut` |
| Stable knowledge IDs | dotted lowercase kebab-case | `ab.camera-movement.push-in-realization` |
| UI labels | human-readable Title Case | `Reaction Hold` |
| Files | lowercase kebab-case | `direction-plan.schema.json` |
| Events | lowercase kebab-case, past tense where practical | `direction-plan-compiled` |
| Diagnostics | `PRISM_<AREA>_<CONDITION>` | `PRISM_TIMING_DURATION_MISMATCH` |

Do not expose provider transport names such as `@Image1` as Prism semantic names. Do not use filenames, upload order or friendly labels as proof of reference authority.

### 6.3 Controlled vocabulary

Canonical enums use physically meaningful terms: `dolly_in`, `truck_left`, `orbit_clockwise`, `static`, `imperceptible_drift`, `hard_cut`, `occlusion_edit`. UI synonyms may map to these values, but persisted data stores only the canonical enum.

Direction is world- or subject-relative and must declare its frame of reference when ambiguity is possible. Avoid values such as `dynamic`, `cinematic`, `dramatic_camera` or `fast` without measurable qualifiers.

### 6.4 Versioning

- `schema_version`: compatibility of serialized software shape.
- `record_version`: revision of one knowledge record.
- `specification_version`: revision of this product contract.
- Stable IDs do not contain versions.
- Breaking schema changes require a migration and a major `schema_version` increment.
- Evidence updates that preserve meaning increment `record_version` only.

## 7. Required inputs

### 7.1 `DirectingIntent`

Required:

- narrative beat;
- emotion and intensity or an explicit neutral state;
- subject description and motion;
- requested duration;
- output mode: `bare_prompt`, `provider_prompt_plan`, or `both`.

Conditionally required:

- start/end shot size when a framing change is requested;
- dialogue text and speaker when dialogue is requested;
- continuity anchors for multi-shot work;
- explicit look intent when a non-neutral look is requested.

Optional:

- preferred/forbidden techniques;
- genre and realism level;
- requested lens, angle, move, transition or audio intent;
- user preference overrides, visibly marked as such.

### 7.2 `AuthorityManifest`

Required whenever references are used:

- authority ID;
- exact live semantic anchor if verified;
- typed role: identity, wardrobe/body, prop, location, motion, start frame, end frame or storyboard;
- physical inclusion state;
- shots of use;
- verification state and source.

Unverified, ambiguous or omitted references must not receive invented anchors.

### 7.3 `CapabilitySnapshot`

Required for provider-targeted compilation:

- provider, model and version identity;
- verification timestamp and source;
- duration, aspect ratio, resolution, audio and reference controls;
- supported prompt fields and separate negative-prompt behavior;
- adapter capabilities and unsupported features.

A stale or absent snapshot permits provider-neutral planning but blocks a claim that provider compilation is executable.

### 7.4 Knowledge selections

- exactly one applicable `StructureContract` for complete assembly;
- only Attribute rules relevant to the requested intent;
- status, `prism_disposition`, confidence and provenance preserved;
- explicit user overrides remain separate from evidence-backed recommendations.

## 8. Required outputs

### 8.1 `DirectionPlan`

Must contain:

- request identity and schema version;
- resolved format mode and total duration;
- ordered `ShotPlan` list;
- `TimingPlan` with exact duration arithmetic;
- selected knowledge IDs and record versions;
- authority bindings and continuity locks;
- compatibility decisions and resolved conflicts;
- user overrides, recommendations and unsupported requests as separate classes;
- provenance and confidence summary.

### 8.2 `ShotPlan`

Every shot must declare:

- purpose, duration and shot size;
- angle/height, lens/optical character and focus behavior;
- movement type, speed, distance/framing change, curve and stabilization;
- subject blocking and camera path;
- performance, physics, lighting and environment behavior;
- action/dialogue/audio timing;
- references used in that shot;
- incoming/outgoing continuity state;
- endpoint composition and reaction hold;
- transition out, except after the final shot.

### 8.3 `BarePrompt`

Must be one complete self-contained prompt with all required references, environment, shot declarations, camera/lens, timecoded action, performance, physics, lighting, look, continuity and audio instructions. Where applicable, `NEGATIVE PROMPT` is the final section. It must contain no Prism-only tags, hidden metadata, unresolved placeholders or adapter transport tokens.

### 8.4 `ProviderPromptPlan`

Must contain:

- provider-neutral direction semantics plus explicit provider compilation choices;
- supported settings mapped from the live capability snapshot;
- adapter instructions for reference-token translation without mutating the canonical prompt;
- separate negative-prompt content only when supported;
- diagnostics for every omitted, approximated or unsupported control.

It must not contain credentials, perform network calls or claim execution.

### 8.5 `SemanticParityReport`

Must compare at minimum:

- shot count and cut count;
- duration and per-shot timing;
- reference authority;
- movement, speed/curve and endpoint;
- shot size, lens, angle and focus;
- blocking, physics, performance and lighting;
- continuity and reaction hold;
- dialogue/audio and look;
- exclusions/negative-prompt handling.

Parity fails if a meaningful decision appears in one rendering but not the other.

## 9. Resolution and validation rules

1. Evidence is descriptive until a record is validated and permitted for Prism.
2. User preference may override a recommendation but cannot be mislabeled as evidence.
3. A contraindication outranks a compatibility edge unless an explicit, visible override supplies a safe alternative.
4. Conflicting rules produce a diagnostic; Prism must not silently choose by file order.
5. Exact parameter values must stay within the selected rule and live capability ranges.
6. Edited coverage with `N` shots requires exactly `N-1` cuts.
7. Per-shot durations and timing beats must sum to the declared total.
8. Every move ends on an explicit composition and includes a hold when narrative comprehension requires it.
9. Exact focal length, shutter or rig is not inferred when evidence supports only a range or optical characteristic.
10. References bind only through verified authority entries; adapter tokens are transport-only.
11. Specific look presets are opt-in profiles, never universal defaults.
12. No generation or cost-bearing action follows from compilation alone.

Diagnostic severity:

- `error`: output would be contradictory, incomplete, unauthorized or falsely executable;
- `warning`: output is usable but includes an approximation, low-confidence rule or user override;
- `info`: transparent compilation choice with no loss of intent.

## 10. Designer contract

The interface must expose, without redefining:

- intent inputs separately from resolved direction;
- evidence-backed recommendation, user preference and provider limitation as visually distinct states;
- stable knowledge ID, confidence, evidence count and provenance on demand;
- shot order, timing arithmetic, compatibility conflicts and endpoint/hold;
- exact reference authority and verification state;
- bare-prompt and structured-output views with parity status;
- error, warning, unsupported, stale-capability and unverified-reference states;
- an explicit separate execution action if generation is later added.

UI labels may be friendly; canonical enum values and stable IDs remain visible through details, export or developer inspection. The UI must not imply that compile means generate.

## 11. Developer contract

Implementation must:

- model Prompt Structure and Attribute Breakdown as separate authority sources;
- preserve stable IDs and independent record versions;
- validate inputs before resolution and outputs after compilation;
- make conflict ordering deterministic and inspectable;
- keep provider adapters outside the semantic core;
- preserve exact canonical semantic anchors while translating transport tokens only in adapters;
- emit machine-readable diagnostics rather than silently dropping unsupported decisions;
- prove semantic parity between structured and bare outputs;
- maintain atomic batch behavior: one invalid result applies none;
- keep provider capabilities live, sourced and time-stamped;
- include tests for duration/cut arithmetic, unknown IDs, deprecated IDs, conflicts, unverified references, stale capabilities, adapter-token leakage and parity failure.

## 12. Naming examples

Correct:

- Type: `DirectionPlan`
- Field: `movement_speed_meters_per_second`
- Enum: `ease_in_hold_ease_out`
- Knowledge ID: `ab.timing.reaction-hold`
- UI label: `Reaction Hold`
- Diagnostic: `PRISM_REFERENCE_UNVERIFIED_ANCHOR`

Incorrect:

- `CinematicCameraRule` when the value means only `dolly_in`;
- `Fast` without a range or comparison;
- `@Image1` as a semantic asset name;
- `KodakDefault` as a universal grade;
- `rule_v2_final` as a stable ID;
- a provider name embedded in a provider-neutral domain type.

## 13. Open questions and provisional defaults

These questions do not block Designer or Developer from using this contract. Until changed by an approved decision record, use the stated default.

| Question | Provisional default | Decision owner |
|---|---|---|
| Minimum knowledge status allowed in production compilation? | `validated` or `promoted`; provisional records require an explicit warning and opt-in. | Director |
| Conflict tie-break after contraindications? | Higher condition specificity, then confidence, then evidence count; unresolved ties are errors. | Director + Developer |
| Capability snapshot freshness window? | Adapter-configured; absent provider proof blocks executable status rather than neutral planning. | Developer |
| Persistence engine and transport API? | Not specified here; choose within architecture work without changing domain names. | Developer |
| Initial UI form factor? | Not specified here; Designer may define it while preserving the concept hierarchy and states. | Designer |
| Initial provider adapters? | No default provider. Implement semantic core first; add adapters only from verified capability work. | Admin + Developer |
| Confidence scale? | Decimal `0.0–1.0` plus evidence count; UI may render labels as a projection. | Director |
| Look profiles? | Opt-in references linked by ID; Kodak remains separate and is never auto-applied. | Director |

## 14. Acceptance criteria

This specification is satisfied when:

1. Designer can build flows and states using the glossary and Designer contract without inventing semantic concepts.
2. Developer can define schemas and validators for every required input/output without inventing names or ownership boundaries.
3. Prompt Structure and Attribute Breakdown remain separate canonical sources linked by stable IDs.
4. One `DirectionPlan` can render both a self-contained `BarePrompt` and a `ProviderPromptPlan`.
5. A parity check detects any material directing difference between those renderings.
6. Provider transport tokens cannot leak into canonical semantic names or the bare prompt.
7. Invalid timing, cut arithmetic, reference authority, conflicts and stale capabilities produce deterministic diagnostics.
8. Recommendations, observed evidence, hypotheses, provider limitations and user overrides remain distinguishable.
9. Compilation cannot trigger generation, spend credits or use credentials.
10. Provider-specific software concerns remain in adapters; general UI/runtime concerns remain with Designer/Developer/Admin.
11. Naming examples pass the conventions in section 6 and deprecated IDs remain resolvable.
12. Tests cover the Developer contract’s listed failure cases before implementation is accepted.

## 15. Downstream handoff

Designer should treat sections 4, 6, 8, 9 and 10 as the UX information contract.

Developer should treat sections 3–9 and 11 as the domain/schema boundary, with executable schemas and tests becoming the enforcement source of truth.

Admin should organize approved artifacts and delegation without changing Prism’s cinematic terms, stable IDs or ownership boundaries.
