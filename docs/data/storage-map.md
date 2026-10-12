# Storage Map

> **Status:** Current

| Store | Purpose |
|---|---|
| Electron `userData/studio-data` | current/recent project pointers, non-secret service profile registry, and encrypted provider credentials |
| `studio-data/service-profiles/<provider>/<profile-id>.enc` | one `safeStorage` ciphertext per provider profile |
| project root | Prism project manifest and owned media |
| `Project/*.prismflow` | portable editable project document |
| `Canvas/workflow.json` | canonical workflow state |
| `Canvas/assets.json` | project asset index |
| `Canvas/history.json` | generation history |
| global styles store | reusable Style assets |
| `.prismasset` | portable bounded asset archive |

New projects use readable roots: Project, Characters, Elements, Locations, Wardrobes, Styles, Storyboards, Canvas, Generated Assets and Imported Assets. Generated/Imported media leaves are Images, Videos and Audio. Existing legacy numbered roots remain readable in place through main/projectFolders.ts; merely opening a legacy project does not move it or create a parallel readable tree. Main-owned projectFolderPath is shared by scaffolding, import/generation, semantic save, portable documents and recovery. It does not strip numbering from filenames, shots, canvases or user-authored category folders.

Writes that replace canonical JSON must be atomic. Schema changes require versioning, migration tests, backup/restore proof, and downgrade/rollback decisions.

Project manifests and portable `.prismflow` documents may persist `serviceProfileOverrides` containing opaque profile IDs. Projects without an override follow the current global default; credentials never enter project storage.


## Native audio persistence — 9 October 2026

Source-tested, not yet installed. Optional ElevenLabs mode and ordered dialogue turns are stored with the existing workflow node; changing mode preserves the separate Speech draft. Existing nodes without these fields remain Speech; an explicitly empty turn list stays empty. No project schema version or credential store changes. Actual AppNext edit/manual-save/remount fixtures use real isolated JSON files to verify exact text, turn identity and numeric values without opening a user project.

The native audio adapters write only a newly allocated owned media file, then register it through the existing asset/index/history owner. Exclusive file creation prevents overwriting an existing asset. On failure they remove only their own unindexed new file, never a pre-existing collision or an indexed result. Fish raw 16-bit mono PCM is wrapped as playable WAV using the actual requested sample rate; other formats retain their encoded bytes. Portable metadata retains exact request text, requested model, format/rate and validated timing metadata. Requested-model metadata is not server-engine attestation.

Published Fish catalogs and compiled schemas remain scoped runtime data, not secrets or project defaults. Catalog refresh does not migrate or rewrite saved values. New/withdrawn model contracts require explicit correction where current input adapters cannot represent them. Broader result-snapshot consumption, voice-profile/multi-speaker inputs and live provider/persistence acceptance remain separate pending gates.


## Derived native timing metadata — 9 October 2026

The optional `falNative.timing` node snapshot stores only an owned data-only field/unit binding. It is derived on contract refresh and included in the runtime fingerprint; it is not authored provider input or a credential. Reconciliation preserves every saved native value/draft when a timing field/unit changes and asks for review. Existing JSON workflow owners retain this optional metadata with no project schema-version change. Native fixture JSON round-trip covers the new field and existing zero/false/null/structured values. Actual production durable workflow acceptance remains part of the combined release gate; older app execution parity is not asserted.

Ephemeral request `timelineSeconds` is derived from typed authoring, verified by main and excluded from provider values. It does not migrate panel timing or parse an approved Manual master.


## Preserved Storyboard boundary ownership — 9 October 2026

No new persisted boundary property or migration. Existing `StoryboardPanel.transitionToNext` remains the authored owner; final Continue survives graph-derived shots instead of being erased. Rewrite batch context derives `final-continue` for a last Continue and keeps locked panels read-only. Unsupported saved values are neither coerced nor rewritten; compilation blocks reviewably. Existing UI normalization remains safe. Seven pure regressions include exact input preservation and Manual byte ownership; this does not claim a new native durable disk migration test or installed release.


## Higgsfield private profile and job boundaries — 9 October 2026

`higgsfield` joins the existing ServiceProvider ownership namespace; credential storage remains encrypted per private profile and project override, with no key in renderer metadata. New generation DTO is `higgsfieldNative`, separate from fal. Runtime preset cache uses the existing scoped-cache owner; scope changes cannot reuse another account/project snapshot. No model schema, endpoint or credential is accepted as executable renderer code. Model list currently discloses bundled/unverified discovery; it does not persist false complete-catalog access.

Generated video/history uses existing main-managed adapters and rechecks current owner and generation identity. Pending/uncertain provider jobs are reported, not falsely confirmed canceled; durable remote-job recovery ledger is still required before release acceptance. Renderer error text survives Electron IPC, while custom Error properties are not relied on. Superseded owners cannot update another project via progress. No migration/user-data writes are run by QA. Actual native service selection/save/reopen and packaged binary availability remain pending; pure profile/dispatcher/media tests are bounded evidence only.


### Higgsfield persisted node controls

Workflow documents retain `StudioNodeData.higgsfieldNative` and per-endpoint `higgsfieldNativePresets`: exact route/revision/label, scalar values including preset UUID, trimming consent and retired sockets. Media references remain document edges, not copied renderer bytes/metadata. Per-route switching and explicit resets retain graph/authored text. Native contract refresh does not silently remap or prune saved incompatible/overloaded edges. Actual isolated AppNext save/remount/reopen retained1080p, removed-but-preserved UUID, consent, exact whitespace and three graph edges. No user project was altered. This is not durable remote provider job recovery; that lifecycle ledger is still required before a complete release.


## Higgsfield durable submission guard — 9 October 2026

Implemented source slice; not installed and not a complete recovery interface. The main-only `HiggsfieldJobStore` owns `dataRoot()/provider-jobs/higgsfield.json` (schema1). It records bounded attempt, original project/document/node/profile, route, timestamps, fingerprint, hashed public credential key ID, remote request ID and final output receipt. The original normalized pre-upload request is encrypted with the existing OS safeStorage adapter; plaintext prompt, secret keys and output/signed provider URLs are not journal metadata. Generation refuses unavailable secure storage before submission. Tests inject fictional encryption; they do not exercise OS keychain encryption.

Serialized strict reads, no-follow file opens, private directory/file modes, atomic rename and file/directory fsync preserve malformed/unknown/oversized/symlink journals rather than resetting them. External-edit comparison detects intervening writes before rename; this is not adversary-proof cross-process CAS or power-loss certification. Unresolved records are retained; resolved metadata is bounded. The duplicate guard uses stable projectId+nodeId across account, route, document or root changes. Job getters retain exact original ownership; explicit relocation recovery is still required.

An intent is durable before the generation POST. Accepted request/status is recorded before polling; ambiguous responses become unknown. Known failed/nsfw/canceled states resolve; completed without persisted output remains blocked. The protected snapshot binds original prompt/account/project/accepted identity, and historical accepted requests are not revalidated as new submissions under a changed contract. Recovery list/actions, output registration/history reconciliation, idempotent result restoration and native restart acceptance are pending. The stable provider request history ID does not yet make appendHistory idempotent. No generation POST replay exists.


## Current Higgsfield journal and output recovery — 9 October 2026

Source implemented and separately exercised with real temporary filesystem journals, actual main/API/output composition and a native AppNext fictional save/reopen fixture. Not installed or live-provider tested. Production `higgsfieldJobStore()` now requires the existing OS safeStorage adapter for the entire private journal: outer schema2 holds encrypted schema1 payload and its digest. Owner/lifecycle metadata are no longer plain editable JSON. Original native requests and ready-file receipts remain separately protected within that payload. Unknown/corrupt/foreign-key/oversized journals are preserved and block requests. Unprotected schema1 journals are refused in production for explicit repair, never reset or silently trusted. Tests use injected fictional protection; OS keychain encryption/access is not QA evidence. Serialized reads are bounded while reading; writes retain private modes, atomic rename, fsync and external-edit comparison.

`higgsfieldOutput.ts` owns deterministic `06. Generated Assets/02. Videos/higgsfield-<attempt-id>.mp4` or `.mov`. A bounded200MiB stream classifies the complete bounded movie file-type box and explicit MIME before reserving its truthful extension, writes an exclusive no-follow .part and fsyncs. An encrypted receipt binds accepted attempt, path, byte count, SHA256 and MIME before exclusive hard-link promotion. It never overwrites an unrelated target. Ready parts/final files are verified and reused after interruption without another download. Partial unconfirmed parts can be replaced only during explicit recovery; mismatched bytes/links/receipts are preserved for review. Header checking does not prove complete decoded-video/output adherence.

The main adapter reconciles existing asset and history owners using stable attempt IDs, preserves original prompt metadata and existing timing, and repairs the project-document projection. Asset/history failures keep the completed job blocked and its verified bytes available. Persisted-result restore also uses that receipt; no provider status/download is necessary. Current selected profile and original public-key identity are required before output recovery. No generation POST is replayed.

Project-wide job views keep renamed-document jobs visible. Explicit Use current document rebinds only the same project/node/root and re-protects its envelope without changing the original request. Whole-root output relocation is not automatic; original records/bytes remain intact and explicit dashboard review can resolve an abandoned request after relocation. Native packaged-process restart, real secure-storage/provider delivery, complete catalogs and whole-app security/release/stress remain open.


## Higgsfield original wire receipt — 9 October 2026

This source batch supersedes the earlier no-generation-POST-replay limitation for new verified receipts only. The outer private journal remains schema2 with the existing protected schema1 payload. New protected request envelopes use version2: original normalized request/owner/fingerprint, exact submitted JSON, endpoint, UUID idempotency key and receipt digest; accepted identity includes original returned status/cancel URLs. The sealed envelope is bounded128KiB and its serialized submission64KiB. No credential secret, receipt body, idempotency key or signed/query URL enters renderer metadata or project documents. The digest detects receipt mismatch and does not provide authentication; at-rest protection remains the existing OS secure-storage adapter.

Envelope1 remains readable for historical accepted work and output receipts. It cannot acquire a new replay identity. New submission fields are validated before persistence/fetch; historical accepted requests are not revalidated as fresh model submissions. Output sealing and same-root document relocation preserve the version and immutable wire receipt. Explicit check/recover reuses it after journal reconstruction; missing/corrupt/foreign receipts block rather than inventing or reconstructing a payload from changed graph/media. A successful replay's acceptance is sealed before status/output work. Failed replay/mismatch/write leaves the original job unresolved; its key/body remain unchanged. Existing deterministic output bytes, asset/history identity and original prompt survive this recovery.

Fictional authenticated-encryption adapters and actual temporary filesystem journals cover interruption/reconstruction. They do not prove OS-keychain behavior or live provider idempotency, and no real user journal is migrated by QA. Full-root output relocation and packaged secure-storage/restart acceptance remain open.


## Higgsfield MP4 and MOV receipt ownership — 9 October 2026

Source supports ISO MP4 and modern QuickTime MOV with an initial bounded `ftyp` box; this does not claim all historical MOV layouts or every video codec. Main-only `higgsfieldMovieContainer.ts` checks major and compatible brands, rejects declared MIME/container conflicts and unrelated audio/image brands, and maps `video/mp4` to `.mp4` and `video/quicktime` to `.mov`. An absent/generic MIME is classified from bytes, never the provider URL suffix. QuickTime requires its compatible `qt  ` brand. The helper does not measure video geometry, duration, FPS, shutter, quality or model adherence.

The existing journal/envelope schema versions remain unchanged; ready receipts widen their MIME domain and require the matching suffix. Existing MP4 recovery remains valid. Reservation is durable before any part-file write; the protected ready receipt precedes exclusive final promotion. An unknown final file in either format, an unowned part or a reserved path of another type is preserved for review. Only an already reserved owned partial may be replaced during explicit recovery. Ready parts, completed files and persisted results restore by protected size/digest/path without another media download or generation. Main asset/index/history metadata retain actual MIME/path and the original prompt.

Temporary fictional transports exercise actual source and compiled main helpers. Tiny local MP4/MOV fixtures are encoded/decoded by bundled ffmpeg and rendered through the actual asset protocol callback in isolated Electron with external network blocked. This proves those local codec fixtures only; full node interaction, packaged OS-secure-storage restart, real provider delivery and whole-root relocation remain open. No real user journal or project was migrated; installed app unchanged.


## Workflow command ownership — 10 October 2026

`WorkflowSaveOwner` pins project identity, root and portable document path for both load and save. `main/workflowPersistence.ts` binds the actual command queue to that owner; renderer `workflowSaveCoordinator` snapshots graph edits, repeats pending newer saves, and rejects callbacks from an old project or superseded same-project activation. Active-account selection preserves documentPath. Canonical `Canvas/workflow.json` and the portable project document retain the same graph; corrupt canonical bytes remain unchanged when load fails. Atomic filesystem writes are queued under the owning project, with existing root/readiness authorization retained.

Native model presets, partial drafts, repairs, fingerprint/revision and retired port/edge state are ordinary persisted graph data. They are not silently dropped when a current schema removes a control or socket. Existing graphs need no destructive migration. Production save/load callback composition and actual renderer save/remount checks exercised isolated canonical and portable files across all five Seedance modes; this does not attest real project/account restart safety or live provider output.

The renderer activation helper sequences owned loading before auxiliary/provider reads and uses the invocation token, not only project ID, to reject superseded hydration. An actual installed failure exposed the previous parallel queue/provider-read overlap; its rollback preceded this repair. Save/load command ownership remains unchanged.


## Obsolete provider settings —10 October2026

provider-settings.json is no longer read, written or enforced. Retain existing bytes without migration/deletion. Availability derives from the selected ServiceProfileStore profile and actual credential-file existence, with runtime project/account guards. Disconnect retains the key; Sign Out removes that profile key. No real-user settings or keys were inspected by this change.


## BytePlus console-link persistence — 12 October 2026

Optional `ImportedAsset.metadata.byteplusPortrait` version 1 stores provider/region, immutable profile ID and non-secret account identifier, console Asset ID, original-byte SHA-256, Image/Video type, linked/revoked state, link timestamp, explicit console attestation and optional known expiry. It follows the canonical asset index and portable project projection, alongside retained authored descriptions. Byte-identical path relocation does not invalidate it; changed bytes or another account do. Unknown expiry remains absent.

Dedicated main link edits hold the asset-index queue through portable projection. A known projection-write failure restores the prior canonical index; a rollback failure reports recovery required. There is no new multi-file crash transaction: the existing canonical index/reopen rules remain authoritative. Reopening does not assert live provider approval. Old projects with no binding retain ordinary media behavior; older readers can ignore the optional field. No destructive migration runs.


## Output folder naming migration — 12 October 2026

Installed ASAR436c314e884d6c4ce645718468a51f725bbb1187b50960b68e94cbfec5239871. Current Media Reuse Acceptance alone was migrated while the app was quiesced, using a full ZIP rollback, collision/symlink/source-drift checks and protected-job ownership preflight. Existing path, protocol URL and relative-path references were updated; authored prose and immutable project/node/asset/account identities were retained. Nine original binary files equal the backup; canonical/portable workflow parity and actual playback/Finder access survive normal restart. Original Haji92 frozen files remain unchanged. Other legacy projects were not migrated.

The migration maintenance script lives in Codex Apps/Prism/Output Folder Naming Migration.py; it is not an automatic runtime migration. Five tests cover actual paths/URLs/portable bytes, collisions, source drift, exception rollback and symlink/protected job preservation. A protected remote job requiring relocation blocks migration rather than receiving an implicit rebind. Forced-crash/power-loss automatic recovery is not established; the full ZIP remains the recovery source. Source and native receipts are owned by Codex Apps/Prism/Output Folder Naming Build Plan.json, Migration Evidence.json and Native Evidence.json.


## Ephemeral MP3 upload derivative — 12 October 2026

Installed main higgsfieldAudioConversion.ts produces a bounded PCM WAV buffer from an already authorized stable MP3 read. It finalizes only its own RIFF/data lengths, preserving decoded samples/rate/channels/duration. No source write, persistent derivative file, new asset/profile, schema migration or journal format change. higgsfieldSeedanceManagedMedia binds opaque original/derived buffer provenance to the same source path and no-follow file identity; both executors share preparation/validation. Existing actual WAV bytes remain unchanged. Upload metadata uses actual derivative WAV MIME while source metadata retains original identity.

Whole unique-set inspection reserves all original buffers; each conversion is capped by64MiB and half the remaining512MiB after originals and already retained derivatives, accounting for current chunks plus concatenation. Expansions fail before upload, never clip. Ten small sources remain admissible. Node/profile/source/cancellation changes block rather than reusing foreign media. These are local retained-buffer/resource limits, not advertised provider limits or OS-RSS certification. Ready output persistence and protected provider jobs remain existing owners.
