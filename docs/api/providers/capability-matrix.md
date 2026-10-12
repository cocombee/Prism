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
| ElevenLabs | direct live-model TTS and Sound Effects v2; existing fal audio routes retained independently | API key; encrypted multi-account profiles |

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

## Direct ElevenLabs audio

New Voiceover nodes use explicit direct ElevenLabs model and voice IDs; new Sound Effects nodes use the direct v2 API. Existing saved `voiceEngine: elevenlabs` and effects without an explicit `audioProvider` retain fal.ai. Fish remains a separate provider. Catalog refresh does not rewrite a saved model, voice or paid route.

Main reads `/v1/models` and paginated `/v2/voices` with protected `xi-api-key` authentication. The renderer receives speech-capable model IDs, names, languages/limits/capabilities and voice IDs/names only. A voice-list permission failure keeps the model catalog and exposes manual voice-ID entry. Models remain fully browsable; featured shortcuts must never hide older live releases. A verified absent model blocks before paid submission.

Direct speech uses `/v1/text-to-speech/{voice_id}` or `/with-timestamps`, exact authored self-contained text, an explicit model ID, query output format, normalization, seed and continuity context. The shared compiler validates ranges and live text/language limits. Eleven v4/v4 Turbo use stability and similarity only; speed/style are omitted and their controls hidden. Older supported models expose speed; style additionally requires live capability metadata. Multilingual v2 uses Auto language. Direct effects use `eleven_text_to_sound_v2`, 0.5–30 seconds, loop and influence. Legacy fal limits remain independently owned.

One paid POST is issued per requested output, with cancellation, bounded responses and no automatic retry. Encoded MP3/Opus/WAV retain their format; raw signed-16-bit PCM and G.711 mu-law/A-law are saved as playable mono WAV and labeled accordingly. Timing alignment stays inside managed audio asset metadata, preserving project relocation and `.prismasset` portability. A failed exclusive create never deletes an existing file; an indexed result survives a later history or project-document error. Native results retain ElevenLabs identity in errors, history and metadata and never use fal estimates or upload credentials.

Source and mocked transport/storage tests, TypeScript and a browser-only production-selector fixture verify these contracts. Full native Canvas/Inspector layout, authenticated API access and playback remain release gates. No live inference is required for these contract tests.

## Service profile ownership

Connection status and generation use the same project override or global default. A different connected account does not make the selected profile ready. Status checks only metadata and key-file existence; startup does not decrypt or migrate keys. Explicit missing/disconnected/signed-out profiles block instead of using a legacy key. Fish Audio now loads its selected encrypted profile through the shared credential owner.

Both historical credential layouts are recognized during compatibility reads and explicit migration: `service-credentials/provider.enc` and the flat `provider-credential.enc`; fal keeps its historical `credential.enc`. Multiple legacy candidates are preserved and require explicit sign-in, rather than choosing an account implicitly. The optional non-secret `profileManagedProviders` registry marker survives modern profile deletion, so leftover old keys cannot restore a deleted service. The schema version stays 1, and explicit refresh still migrates one unambiguous legacy key only after successful encrypted profile and registry writes.

## Model menu browsing — 8 October 2026

Active model selectors use Featured shortcuts above All Models. Five releases per service are targeted when available, with a maximum of seven and no padding of small catalogs. Fal/native services stay separate. Video browsing is service → company → release → exact supported mode; a featured multi-mode release reveals its choices without changing the saved route. Single-route model shortcuts select only on an explicit click or keyboard activation. Older supported routes remain reachable through browsing/search. Saved selections are never rewritten by featured ranking.

The text assistant and OmniRoute DTOs now retain their complete eligible catalogs, including older root releases and dated IDs. Text eligibility and exact-ID deduplication still apply. Features/New badges require release evidence: Featured alone, beta labels and version sorting do not imply New. This checkpoint has no provider release-date source attached, so it does not manufacture New labels. The shared menu accepts recent verified release dates for later catalog metadata.

This presentation checkpoint uses existing adapter-supported fal image/video routes and live native catalogs already provided by each service. Live fal discovery/schema onboarding, persisted verified change badges, Higgsfield and remaining provider adapters remain pending. Browser checks cover the real selector and production CSS with non-secret mock catalogs; they do not verify the installed Electron app, authenticated model entitlement or paid inference.

## Request/account response ownership — 8 October 2026

ProviderRequestState owns transient failure state, async provider scope, a copy of project profile overrides and revisions for project/account changes. Active IPC connections, catalogs, account checks, rewrites and generation run in that scope. Profile mutation suspends that provider while it writes; success clears its memo, failure retains the previous memo. Other services stay independent. A late old-profile success/failure cannot delete or replace the current account's failure. Stale read/rewrite success or errors return cancellation. Key reads check ownership before and after the exclusive encrypted-profile read, and paid submission checks after asynchronous media/catalog preparation. ElevenLabs checks immediately before its one POST, after the live model preflight. No new persistent state or keys are stored by this module.

Already submitted generations retain existing project lifecycle and managed-output behavior. A profile switch suppresses their account memo writes; it does not discard a completed paid output in the same project. Project switches retain GenerationLifecycle cancellation. The concurrent project-profile persistence transaction remains a separate open audit; this request-owner module is not proof that all project files are transactionally safe.

Verification: deferred account/project races, overlapping mutations, normal/failed changes, captured overrides, an actual file-backed profile store and mocked ElevenLabs preflight-to-POST guard. No authenticated request, upload, paid call or native launch.


## Reference capacity and update boundary — 9 October 2026

`shared/referenceCapacity.ts` owns pre-upload Seedance reference counting from the selected registry contract and visible physical reference records. Main/renderer readiness and BytePlus preparation reject overflow rather than accepting a clipped paid request. `shared/shotRecipes.ts` distinguishes physical camera mechanisms; authored native controls remain authoritative. Thirty-three inspected public multi-shot prompts informed that wording, without establishing output adherence or hidden provider bytes.

Provider discovery/schema foundation is not integration completion. Every automatic update must drive the exact selected model's menu, input roles/ports, native controls, readiness, capacities, upload binding, prompt mapping, payload validation and output interpretation from the same owned contract. Schema bounds need verified semantic adapters; current description-only limits retain primary-source provenance. Save/reopen must preserve authored values and expose incompatible/removed roles. Known supported input types can refresh automatically; unfamiliar transports remain explicitly unsupported until an adapter exists. Preserve independent fal/native-service catalogs, exact IDs and selected account/project ownership.


## Dynamic contract projection — 9October2026

`shared/falRuntimeInputs.ts` describes exact selected schema fields, control/placement metadata, known native media inputs, verified role mappings and capacity provenance. `main/falSchemaDiscovery.ts` returns this data plus SHA-256 schema/output/adapter identity through existing scoped discovery/IPC. Saved values survive refresh; removed/invalid fields and changed bindings require repair rather than coercion or clipping. No schema descriptions, filenames or model-name guesses authorize roles. Provider-declared generic media fields bind only their exact native input and inherit no camera/appearance authority; genuinely new transports require an adapter.

The remaining renderer, dynamic-port, pre-upload payload/result and native-service integration must use this same contract before automatic model updates are complete. Input discovery alone is not runnable support. Per-node everyday/advanced controls and sample preview functionality need tests against actual APIs. Speech preview now matches existing audio wire text; no Seedance template is forced onto speech. Other audited prompt/default/native-controls/reference gaps remain open.


## ElevenLabs primary controls and authored multi-shot repair — 9 October 2026

Source update: direct ElevenLabs Voiceover exposes its local speech editor, named voice search, explicit catalog sample Play/Stop, and Stability/Similarity. Language, output and supported speed/style remain in the existing right Inspector. Audio nodes remain self-contained: local editors do not add upstream text ports. Preview metadata contains only IDs/names plus a validated optional HTTPS preview_url; private samples/settings/sharing are excluded. Sample playback stops on voice/catalog-profile changes and unmount; no sample or synthesis starts automatically.

Prompt compiler update: non-Seedance production prompts no longer invent a generic lighting/style or music prohibition. Explicit authored Style, typed character state/deltas, state-authority roles and once-only dialogue survive Cut/Continue and required prompt budgeting. Native Kling groups Continue beats into one unbroken shot while preserving the full continuity ledger, global source plan and endpoint frame scope. Exact reviewed V3/O3 routes reject unrepresentable native plans before preparation: no duration rounding, padding or panel truncation. A Manual master is never split/repeated as native multi_prompt. Exact route receipts and source/candidate rollback manifests are in the Codex Apps/Prism inspection task.

Candidate gates: 1505 pure tests / 191 files, TypeScript and production build; actual Voiceover component native fixture at forced250, normal315 and forced375 widths covers speech editing, names/search, sample lifecycle, missing samples, slider separation and Settings callback routing. Preview audio is mocked and network/generation blocked. This does not verify live sample delivery, the real AppNext right-panel session, provider output adherence, or every node. Unwired falModelFlow prototype is excluded from source promotion. Installed app is unchanged pending a separately verified replacement. End-to-end automatic model/input/port/payload refresh, full Codex Seedance parity and final whole-app stress remain open.


### User correction: existing Prism control owners only

The initial node-native Stability/Similarity sliders and separate sample button were rejected by the user as outside Prism's established control families. Replaced them with existing SimpleMenuSelect/GroupedMenuSelect fields inside FluidControlGroup and the existing compact-settings compact-options circle icon action for explicit sample testing. Deleted custom range/sample action styling. Native fixture compares exact fonts, weights, insets, radii and heights against existing selectors and the existing Settings circle; tests actual Stability selection, model preservation and sample lifecycle. A scoped direct-eleven-settings Inspector rule restores Language, Output and supported speed previously hidden by the old primary-field duplication rule. Actual AppNext native fixture checks painted control bounds, not just DOM text. No unrelated provider controls or primary field geometry changed.

Gates and installed state are recorded in the Codex Apps/Prism checkpoint. Original prompt/runtime batch remains applied; this correction supersedes its initial design evidence. The interim installed app remains unchanged. Remaining automatic runtime integration, other-node functional acceptance, live/provider output and final whole-app stress are open.


## Exact schema-bound fal execution — 9 October 2026

Source adds an explicit native fal request binding with exact endpoint, category/flow and schema fingerprint, separately typed media fields and preserved JSON values. Main obtains its own account/project-owned contract, validates counts/required values/enum/range constraints and every managed media type before creating a client or uploading, validates actual uploaded URLs before submission, and rechecks the owned contract after preparation. Changed contracts/removed fields/conflicting bindings are explicit repair errors; no static endpoint substitution or reference clipping. Unknown required transports and unavailable output extractors stop before generation.

One owned SDK client handles the native upload/submission route. The full result schema is validated in bounded workers; every declared image/video/audio item is persisted, while the primary item matches the node flow. Native counts stay inside one request instead of multiplying the legacy Quantity loop. Existing result-history storage and UI control owners remain in use; no visual tokens/styles or dependencies changed. Source also integrates reviewed date-based per-service Featured ranking (all releases/modes remain accessible), independent deduplication per service, and preservation of authored multiline Seedance text/explicit Style, Lighting and locks under prompt budgets. Compiler provenance remains unchanged pending complete parity.

Verification receipts live in Codex Apps/Prism. Tests use captured public schemas plus fictional future fields, bounded real compiler/validator workers and mocked transport/media; no user credentials, account reads, media downloads or paid generation. Actual main-function extraction verifies native dispatch before static adapters, the owned-client upload argument order, visible prompt equality, reference retention and managed media type checks. Whole pure/TypeScript/build gates are recorded after source application.

Open: live Canvas/Inspector menu and field consumption, dynamic ports/graph binding, save/reopen contract reconciliation, non-schema native service updates, all remaining node/skill/provider acceptance, desktop replacement and final whole-app stress. Automatic provider updating is NOT yet verified end to end. The installed working app and protected historical bundle remain untouched.


## Conditional schema validation ownership — 9 October 2026

The shared bounded JSON-schema compiler and isolated validator preserve `if`, `then`, `else` and boolean schemas. Only a declared value mismatch chooses another branch; depth, unsupported-pattern and evaluation failures propagate. Defaults never create missing fields. Root constraints remain independently enforced, and then/else without an if do not apply. The existing independent Higgsfield public readContract path uses this owner without borrowing fal transport or credentials.

The captured Seedance2.5 reference input permits image-only, video-only or audio-only arrays, with their own nonempty/count/type constraints. Missing references and explicitly present empty arrays remain invalid. The production worker can compile83of85retained input captures; influencer `$defs` and Kling Omni's nonstandard `mode` stay unsupported. This is retained input evidence, not a fresh live API assertion or output-schema proof.

Conditional root forms retain an explicit unsupportedInputs guard until native controls/media binding can project their branches coherently. The three verified Genjutsu route flags are unchanged; compiled schemas alone do not make additional endpoints runnable. Renderer ports/controls, upload preparation, exact protected request/idempotency, output MIME/container/persistence and native acceptance remain required before full integration. Public metadata freshness is separate: the current referenced doc was inaccessible/blocked and no access bypass was used. Primary conditional semantics: https://json-schema.org/understanding-json-schema/reference/conditionals .


## Higgsfield protected wire submission and reconciliation — 9 October 2026

Source implementation; installed app and runnable catalog scope are unchanged. The existing main API creates one immutable serialized JSON body and UUID idempotency key for each intended generation. The journal seals both, with a receipt digest, before the first generation fetch. Materialized controls, source URL ownership and reference order/count must match the original normalized request. The same serialized body is sent, even if a caller mutates its object while the durable write awaits. Uploads, status and cancellation do not inherit the generation idempotency header.

The existing check/recover commands can reconcile a lost initial response only with its verified protected wire receipt, original document/node/profile and public credential identity. They reuse the original endpoint, body and key without preparing or uploading media again. Acceptance is durable before polling/output work. A replay receipt is not terminal-status evidence; status is read separately. HTTP422 mismatch, network uncertainty and failed acceptance storage remain unresolved and block another Run; no new key or automatic retry is created. Historical envelope1 requests without a wire receipt remain dashboard-only when their remote ID is unknown.

Returned status/cancel URLs are retained in the protected envelope, including opaque query bytes. Credentials are sent only to the original request ID's exact API-origin status/cancel path, with redirects refused. Identity or returned-URL changes block. Missing URLs retain the historical canonical fallback; no alternative service host/path is inferred. The renderer receives only a verified reconciliation-availability flag and existing job metadata. Existing compact selectors/actions are reused. This is not authenticated provider delivery, new Seedance graph/control/reference support, other output formats or packaged restart acceptance.

Primary sources: [Idempotent requests](https://docs.higgsfield.ai/docs/concepts/idempotency), [Requests and lifecycle](https://docs.higgsfield.ai/docs/concepts/requests). Source owners: `work/src/main/higgsfieldSubmission.ts`, `higgsfieldApi.ts`, `higgsfieldJobLifecycle.ts`, `higgsfieldJobRecovery.ts`; composition regressions: `higgsfieldSubmissionRecovery.test.ts`, `higgsfieldJobWiring.test.ts`.


## Higgsfield native output containers — 9 October 2026

Source accepts actual MP4 (`video/mp4`) and modern QuickTime MOV (`video/quicktime`) output bytes through the same protected job/output/index/history owner. MIME, header compatibility and deterministic extension agree; conflicts stop rather than relabeling a MOV as MP4. Explicit recovery retains original request identity and restores verified bytes without another generation/download. See `data/storage-map.md` for receipt and container limits; executable owners are `work/src/main/higgsfieldMovieContainer.ts`, `higgsfieldOutput.ts`, `higgsfieldJobStore.ts`, and `higgsfieldJobLifecycle.ts`.

Local source/compiled composition and tiny real ffmpeg/Electron fixtures are verified without accounts, external media downloads or paid provider execution. Installed app and runnable route flags are unchanged. This output slice does not enable native Seedance modes: controls, media graph binding, audio preparation and exact provider reference-token transport still require verification. The current model-specific human reference page documents `output_format` while its inline example uses `bitrate_mode`; the retained input capture declares `bitrate_mode` without `output_format`. This conflict remains explicit until a current authoritative input contract resolves it.

Primary references: [Higgsfield Seedance reference API](https://open.higgsfield.ai/models/bytedance/seedance-2.5/reference-to-video/api-reference), [QuickTime file-type compatibility](https://developer.apple.com/documentation/quicktime-file-format/file_type_compatibility_atom), [Registered file brands](https://mp4ra.org/registered-types/brands). Input-schema evidence and video-container evidence are distinct.


## Reviewed Higgsfield primary video routes — 11 October 2026

The selectable registry adds bounded Text and Reference adapters for Kling 3.0 / 2.6, Wan 3.0 / 2.7, MiniMax H3 / Hailuo 2.3, LTX 2.5 and PixVerse V6. These are exact reviewed native Higgsfield routes, not fal aliases. Each has a public model-specific schema fixture, a distinct zero-media or typed-reference planner and executor, current main-owned schema/digest checks before preparation and submission, protected job receipts and the existing scoped account identity. This is eight Text plus eight Reference routes alongside the retained five Seedance and three historical Genjutsu contracts. Genjutsu and Video Edit/Extend remain excluded from the ordinary Video Generator menu. Discovery does not admit the rest of the provider catalog automatically.

Text takes no media. Reference uses the exact selected route's image/start/end or reference arrays and current count/required limits. Wan 3.0 uses its reviewed image-to-video route; its separate full reference route with document/web file/link inputs remains unimplemented. Do not promise video-reference input for every Reference model. Kling 3.0 optional structured elements/multi_prompt and Wan 2.7 Text audio_url are omitted in these main-prompt adapters; saved authored values in omitted inputs block for review rather than being dropped. New required/unowned transports or changed shapes cannot bypass the adapter. Published schema omission of additionalProperties is retained verbatim; reviewed adapters still whitelist declared inputs and explicit open-shape drift blocks.

The production menu preserves direct exact model/type/tier/provider choices across the full admitted connected image/video catalog. The later user correction supersedes the model-only projection and added Settings Mode widget. Choosing an original endpoint invokes its existing selection/reconciliation path; sockets and schema-owned controls follow that exact route. Manual prompt bytes and legacy saved selections/presets/edges are preserved. Prompt family is determined by the reviewed technology maker rather than treating every Higgsfield model as Seedance. Verification uses fake HTTP and isolated native UI only; live billable generation, output quality, the dedicated Genjutsu node, subscription access and the paused full audit remain outside this correction.

## fal Seedance reference syntax correction — 13 October 2026

The current fal Seedance2.5 reference API uses @ImageN, @VideoN and @AudioN indexed separately by physical input array. nativeFalPromptTransport and the legacy fal transport apply this only at submission; visible/saved semantic asset names remain intact. Model version alone must not select another host's syntax. BytePlus2.5 behavior is retained independently. Original-audio Lip-sync intent does not establish exact waveform reproduction from a generative provider. Source: https://fal.ai/models/bytedance/seedance-2.5/reference-to-video/api. Regression owners: nativeFalPromptTransport.test.ts, falNativeGraph.test.ts, providerPromptBody.test.ts and mediaReferenceModes.test.ts.
