import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const skillMetadata = readFileSync(new URL('../../../skills/prism-foundry-product-standard/SKILL.md', import.meta.url), 'utf8')
const contract = readFileSync(new URL('../../../skills/prism-foundry-product-standard/references/product-contract.md', import.meta.url), 'utf8')
const docsRoot = fileURLToPath(new URL('../../../docs/', import.meta.url))

function markdownTree(path: string): string {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => entry.isDirectory()
    ? [markdownTree(join(path, entry.name))]
    : entry.name.endsWith('.md') ? [readFileSync(join(path, entry.name), 'utf8')] : []).join('\n')
}

const skill = `${skillMetadata}\n${contract}\n${markdownTree(docsRoot)}`

describe('Prism Foundry product skill', () => {
  it('keeps valid skill metadata and the learned media-batch List contract', () => {
    expect(skillMetadata).toMatch(/^---\nname: prism-foundry-product-standard\ndescription:/)
    expect(skill).toContain('List is an ordered media-batch surface for Image, Video, or Audio only')
    expect(skill).toContain('one pending box per requested output inside one List node')
    expect(skill).toContain('Never show Keep/Pick, As List/As References, textareas, or a detached footer plus')
    expect(skill).toContain('an ordinary downstream media input receives the currently selected result, while a connected List receives the full generated batch')
  })

  it('protects bidirectional quantity synchronization and non-destructive completed media', () => {
    expect(contract).toContain('Generator batching and List use one synchronized contract')
    expect(contract).toContain('List `Add Output` or removal of the last empty pending box updates that one generator')
    expect(contract).toContain('Quantity reduction removes only excess pending slots; completed media remains preserved')
    expect(contract).toContain('quantity never creates one automatically')
  })

  it('protects basename-only media Rename with immutable real extensions', () => {
    expect(skill).toContain('every Rename field edits the basename only')
    expect(skill).toContain('preserves the existing on-disk extension byte-for-byte')
    expect(skill).toContain('dedicated conversion/export workflow that actually transcodes the media')
    expect(contract).toContain('all Rename fields seed and edit only the basename')
    expect(contract).toContain('main process always reattaches the unchanged source extension')
    expect(contract).toContain('can never spoof or change the encoded format')
  })

  it('protects prompt-first semantic creation and optional Style-only input', () => {
    expect(skill).toContain('start in truthful Browse and wait for the compact Create action; never auto-expand the editor')
    expect(skill).toContain('an empty Character prompt run creates the mandatory Face')
    expect(skill).toContain('an empty Element prompt run creates the mandatory Three-Quarter view')
    expect(skill).toContain('Element priority is exactly Three-Quarter, Front, Side, Back from strongest to weakest')
    expect(skill).toContain('exactly one optional typed Style input')
    expect(contract).toContain('Describe the character to create…')
    expect(contract).toContain('Describe the element to create…')
    expect(contract).toContain('Style itself remains strictly output-only')
  })

  it('protects the full-width Storyboard topbar equalization rule', () => {
    expect(skill).toContain('visible `Model` and `Type` labels represent Model Target and Sequence Type')
    expect(contract).toContain('Equalize the Storyboard topbar as one grid rather than intrinsic flex groups')
    expect(contract).toContain('On the second row, Type absorbs the true remaining width')
  })

  it('protects honest global Motion FPS and full Canvas preview dots', () => {
    expect(skill).toContain('Motion FPS is visual movement intent')
    expect(skill).toContain('exactly `12, 16, 24, 25, 35, 50, 60`')
    expect(contract).toContain('Native FPS and Motion FPS are separate concepts')
    expect(contract).toContain('Numeric values use lowercase `fps`')
    expect(contract).toContain('Never show `Provider Native`')
    expect(contract).toContain('dot field continues uninterrupted to the top edge')
  })

  it('protects overflow-only menu scrollbar space', () => {
    expect(skill).toContain('Scrollbar space is conditional in every selector and popover')
    expect(contract).toContain('Scrollbar tracks and gutters appear only for genuine overflow')
  })

  it('protects startup recovery from orphaned generation state', () => {
    expect(skill).toContain('Treat persisted `queued` and `running` states as process-scoped')
    expect(skill).toContain('keep result-bearing actions as Rerun')
    expect(contract).toContain('Generation controllers, subscriptions, and provider callbacks are process-scoped')
    expect(contract).toContain('Never restore `Generating…` or `Finishing…` from workflow JSON')
    expect(skill).toContain('A software or Flight Tester refresh never changes a saved local project')
    expect(skill).toContain('never resurrect deliberately deleted older results')
    expect(skill).toContain('never the stale list captured at run start')
    expect(skill).toContain('no broken carousel slot can return')
    expect(contract).toContain('Before orphaned-run recovery can write anything')
    expect(contract).toContain('Never use general History reconciliation')
    expect(contract).toContain('completion merges only the new provider batch into the live current result list')
    expect(contract).toContain('Every hydration prunes missing managed generated-result paths')
  })

  it('protects generated-media carousel hover and double-click ownership', () => {
    expect(skill).toContain('Previous/Next result control is hover/focus-only')
    expect(skill).toContain('a double-click therefore performs the selected direction twice')
    expect(skill).toContain('suppress native text/image selection and image dragging')
    expect(contract).toContain('invisible and non-interactive until its media stage is hovered or keyboard-focused')
    expect(contract).toContain('stop pointer/double-click propagation without cancelling their ordinary click events')
    expect(contract).toContain('preventing any browser-selection tint')
  })

  it('protects the generating halo from the global flat shadow reset', () => {
    expect(skill).toContain('Global flat-design shadow resets must explicitly exclude')
    expect(contract).toContain('must exclude the inner `.is-generating` Studio/Storyboard node')
    expect(contract).toContain('wins over `node-generating-halo` is a regression')
    expect(skill).toContain('maximum is `0 0 25px 7px rgba(155,96,255,.406)`')
    expect(skill).toContain('exactly `70%`')
    expect(skill).toContain('minimum is exactly `20%`')
    expect(skill).toContain('one breath lasts `3.1s`')
    expect(skill).toContain('anchored at `inset: 0`')
    expect(skill).toContain("not at the old animation's expanded endpoint")
    expect(contract).toContain('The inner edge/limit never moves')
    expect(contract).toContain("exactly on the node border where the earlier animation's minimum boundary began")
    expect(contract).toContain('always-visible outer band')
    expect(contract).toContain('Full-node shadow repainting makes the Canvas lag')
  })

  it('protects continuous floating-menu anchoring and lighter scrollbars', () => {
    expect(skill).toContain('continuously follows its trigger during canvas pan, zoom, node movement, window resize, and scrolling')
    expect(contract).toContain('fixed viewport rendering must never leave a menu floating at an obsolete coordinate')
    expect(contract).toContain('exactly 70% of the previous treatment')
  })

  it('protects the Storyboard Model Target FPS tooltip from provider errors', () => {
    expect(skill).toContain('Storyboard Model Target is non-billable planning guidance')
    expect(contract).toContain('Native FPS ceiling used to determine the maximum Motion FPS')
    expect(contract).toContain('never substitutes provider-credit, API-permission, entitlement, or submission errors')
  })

  it('protects the learned quarter-screen application-shell contract', () => {
    expect(skill).toContain('quarter-screen macOS use as a first-class application-shell layout')
    expect(skill).toContain('440px minimum window width')
    expect(skill).toContain('two-row, four-column mini palette')
    expect(skill).toContain('launcher only opens the palette and must never execute alignment itself')
    expect(contract).toContain('no generic `Workflow` word/name field')
    expect(contract).toContain('collapse project identity, Save, Assets, History, and Connections to icon-only controls')
    expect(skill).toContain('no freehand Draw tool and no `P` shortcut')
    expect(contract).toContain('Existing persisted Drawing nodes remain readable and renderable')
  })

  it('protects the direct ownership-aware node toolbar', () => {
    expect(skill).toContain('no Run chevron/dropdown and no More menu')
    expect(skill).toContain('Run, Connect, Duplicate, Lock/Unlock Position, Rename only for a user-owned materialized asset, then Delete always last')
    expect(contract).toContain('Pen means Rename and appears only on user-owned materialized assets')
    expect(skill).toContain('Reusable multi-view Character and Element assets are named and exported as one `.prismasset` package')
    expect(contract).toContain('A reusable multi-view Character or Element is one named Prism Asset')
    expect(contract).toContain('Never append `.jpg` to the logical Prism Asset name')
    expect(skill).toContain('A Rename action must update the canonical logical asset')
    expect(skill).toContain('Unicode-aware lowercase words joined by single dashes')
    expect(contract).toContain('a node tag is exactly that name with one leading `@`')
    expect(contract).toContain('changing only `referenceTag` is a defect')
    expect(contract).toContain('library rails never show Previous/Next carousel arrows')
    expect(contract).toContain('never shrink, shift, or add side padding')
    expect(contract).toContain('built-in/application Style presets never expose it')
    expect(contract).toContain('Run remains present but greyed with its exact readiness tooltip')
  })

  it('protects locked nodes from acting as Magnetic Guides moving sources', () => {
    expect(skill).toContain('A locked node is never a Magnetic Guides moving source')
    expect(contract).toContain('A locked node never initiates Magnetic Guides')
    expect(contract).toContain('remain valid stationary alignment and equal-gap targets')
  })

  it('protects immediate Magnetic Guides icon feedback', () => {
    expect(skill).toContain('Magnetic Guides icon state is immediate and independent of pointer hover')
    expect(contract).toContain('visually switches Off immediately on click even while still hovered')
    expect(contract).toContain('inactive hover state is restrained and neutral, never identical to On')
  })

  it('protects the globally enlarged two-pixel typography scale', () => {
    expect(skill).toContain('every fixed UI font size is at least `2px` larger')
    expect(skill).toContain('Canvas Assets is the deliberate readability exception')
    expect(skill).toContain('View-angle thumbnail captions retain their original compact `8px` size')
    expect(skill).toContain('Compact text actions such as Storyboard `All` and reusable-asset `Save` use regular `400` weight')
    expect(skill).toContain('every `Output 1–4` title is exactly `7px`')
    expect(skill).toContain('connected-input tag, type, and `HARD RULE` text')
    expect(skill).toContain('`No Media Yet`, Upload/Choose Media, Character, Element, and Location empty-state titles')
    expect(skill).toContain('every node-local `Describe…` prompt/placeholder')
    expect(skill).toContain('Guide/Auto/Lock fidelity choices')
    expect(skill).toContain('descriptive subtitle directly beneath every node name')
    expect(skill).toContain('compact Character selection rail shows one head-safe Face thumbnail')
    expect(skill).toContain('low-opacity, no-fill simplified 3D surface-mesh framework')
    expect(skill).toContain('Character view priority is exactly Face, Right Three-Quarter, Profile, Full Body, Back, Smile, Left Three-Quarter, Side Body, Back Body')
    expect(skill).toContain('true opposite 45-degree yaw views')
    expect(contract).toContain('Characters use nine identity views')
    expect(contract).toContain('Right Three-Quarter and Left Three-Quarter are true opposite 45-degree yaw views')
    expect(contract).toContain('Side Body is a true full-body side profile')
    expect(contract).toContain('Create Using Prompt and Create Using Reference each instantiate only the Character node')
    expect(contract).toContain('a legacy six-view Character is incomplete')
    expect(contract).toContain('Seedream 5.0 Pro Edit (`bytedance/seedream/v5/pro/edit`)')
    expect(contract).toContain('GPT Image 2 Edit (`openai/gpt-image-2/edit`)')
    expect(contract).toContain('balanced multi-angle contact sheet')
    expect(contract).toContain('compact the next available view forward whenever an earlier canonical view is absent')
    expect(contract).toContain('legacy managed members missing `assetName`')
    expect(contract).toContain('`--font-node-control`')
    expect(contract).toContain('natural teeth, lip shape, and expression asymmetry are identity evidence')
    expect(skill).toContain('nine high-resolution transparent frameworks')
    expect(skill).toContain('perceived line weight matches portrait meshes')
    expect(skill).toContain('share one exact `25px` height')
    expect(skill).toContain('Storyboard as the canonical regional palette')
    expect(contract).toContain('outer shell and header `#17161b`')
    expect(contract).toContain('body region `#121116`')
    expect(contract).toContain('input/media-well region `#111015`')
    expect(contract).toContain('shared `12px` node-title and `8px` subtitle tokens')
    expect(contract).toContain('Preprocessing removes isolated chroma-key/floating pixels')
    expect(skill).toContain('perceptually visible pixel bounds')
    expect(skill).toContain('compare perceived main-body mass body-to-body')
    expect(contract).toContain('perceptually visible mesh pixels')
    expect(contract).toContain('approved Teapot corrections are Three-Quarter `0.85`, Front `0.85`, Side `0.95`')
    expect(skill).toContain('Every node header and every terminal painted region')
    expect(skill).toContain('footerless body such as Gallery')
    expect(contract).toContain('no header, footer, or terminal body fill may protrude through the shell')
    expect(contract).toContain('equal top and bottom spacing')
    expect(contract).toContain('same exact `25px` height')
    expect(skill).toContain('generic header-button rule must exclude `.header-readiness-pill`')
    expect(contract).toContain('no Storyboard-local size, font, padding, or state-color override')
    expect(skill).toContain('developer-only request X-Ray enumerates every selectable provider-effective control')
    expect(contract).toContain('negative prompt, safety tolerance, auto-fix, native/motion FPS')
    expect(skill).toContain('Assets and the node Options sidebar are mutually exclusive')
    expect(skill).toContain('larger text never clips, bleeds, overlaps, or forces a fixed-width node wider')
    expect(contract).toContain('every previously fixed UI font size is increased by at least `2px`')
    expect(contract).toContain('asset-card title/subtitle receive another `2px` increase')
    expect(contract).toContain('type label such as `Media Collection`, and `HARD RULE` copy')
    expect(contract).toContain('Compact output and node-local empty-state titles use a shared `7px` token')
    expect(contract).toContain('Automatic Kling routing has no separate visible notice')
    expect(contract).toContain('compact status-pill-shaped action containing the matching icon plus `Run`, `Stop`, or `Rerun`')
    expect(skill).toContain('`runState` alone may never resurrect Play while prior generated media is still present')
    expect(contract).toContain('Generated-result presence is the durable Rerun truth')
    expect(contract).toContain('may change status messaging but may never replace Rerun with Play')
    expect(contract).toContain('Search placeholder text and the following `Custom Character`, `Custom Style`, `Custom Location`, or `Custom Element` heading share one exact left edge')
    expect(contract).toContain('break the 440px application-shell minimum')
  })

  it('protects professional Magnetic Guides tooltip copy', () => {
    expect(skill).toContain('professionally concise tooltip `Magnetic Tools`')
    expect(contract).toContain('uses exactly the concise tooltip `Magnetic Tools` in both states')
  })

  it('requires painted-pixel selector equalization instead of stretched layout boxes', () => {
    expect(skill).toContain('painted-pixel calculation')
    expect(skill).toContain('a stretched grid-label box')
    expect(contract).toContain('painted glyph pixel bounds')
    expect(contract).toContain('a track width inherited from the prior layout pass')
  })

  it('uses shared chevron selectors for bounded discrete on-node values', () => {
    expect(skill).toContain('one downward chevron instead of the browser\'s up/down number spinner')
    expect(skill).toContain('such as `1.2×`')
    expect(contract).toContain('never the browser\'s native up/down number spinner')
    expect(contract).toContain('supersedes the earlier native-spinner requirement')
  })

  it('protects the one-minute autosave cadence', () => {
    expect(skill).toContain('Autosave dirty workflow state on a one-minute cadence only')
    expect(skill).toContain('never perform sub-minute workflow writes')
    expect(contract).toContain('Autosave changed workflow state only on a one-minute cadence')
    expect(contract).toContain('never perform automatic workflow writes more than once within 60 seconds')
    expect(contract).toContain('Saving…` stays expanded only while the write is actually in flight')
  })

  it('requires a true Flight Tester process refresh around packaged hashed assets', () => {
    expect(skill).toContain('fully quit its existing process')
    expect(skill).toContain('raising or reusing the pre-package window is not a refresh')
    expect(contract).toContain('A valid refresh is a process boundary')
    expect(contract).toContain('stale hashed asset URLs can render broken-image placeholders')
  })

  it('keeps smooth incompatible icon guidance independent from existing wire geometry', () => {
    expect(skill).toContain('one smooth eased transition')
    expect(skill).toContain('measured edge anchor and wire stay fixed')
    expect(contract).toContain('smoothly retract and hide only its painted icon')
    expect(contract).toContain('Icon guidance never animates an existing edge')
  })

  it('forbids self-node edges in guidance, commit validation, and request assembly', () => {
    expect(skill).toContain('may never connect any output back into any input on itself')
    expect(contract).toContain('same node identity are always invalid regardless of compatible signals')
    expect(contract).toContain('reject any persisted self-edge again before provider request assembly')
  })

  it('pre-measures every wire anchor behind the deployed icon before drag start', () => {
    expect(skill).toContain('permanently measured at the outward deployed-icon centre before hover or pointer-down')
    expect(contract).toContain('before hover and before pointer-down')
    expect(contract).toContain('temporary connection line therefore begins behind the output icon on its first frame')
    expect(contract).toContain('Starting Frame and Ending Frame use distinct timeline-standard icons')
    expect(contract).not.toContain('live edge always continues to the node-body anchor')
  })

  it('protects terminal media typing, direction authority, and the port hover corridor', () => {
    expect(skill).toContain('Gallery is a media-only terminal')
    expect(skill).toContain('Legacy generated Output nodes remain source-only')
    expect(skill).toContain('production shot specification in this fixed order')
    expect(skill).toContain('Image prompts retain their still-frame Direction Layer')
    expect(skill).toContain('POSITIVE LOCKS')
    expect(skill).toContain('continuous pointer corridor from node body to icon')
    expect(skill).toContain('overlapping transparent pseudo-element extending toward the node')
    expect(skill).toContain('full quick-connect picker lifetime')
    expect(skill).toContain('including `maxConnections`')
    expect(skill).toContain('retaining the first edge in stable array order')
    expect(skill).toContain('stale compiled Storyboard remains a valid text-only shot plan')
    expect(skill).toContain("declared typed input ports as the single connection contract")
    expect(contract).toContain('Reject raw Prompt/text and text-Router edges before commit')
    expect(contract).toContain('nodeInputPorts` is the single source of truth for connection topology')
    expect(contract).toContain('painted circle remains exactly 32px')
    expect(contract).toContain('resizing the measured handle visibly detaches the wire endpoint')
    expect(contract).toContain('initiating port deployed until the picker completes or is cancelled')
    expect(contract).toContain('accepts exactly one Storyboard plan')
    expect(contract).toContain('show a non-blocking stale-map warning')
    expect(contract).toContain('or add generic camera/direction prose to a precision Image Editor request')
    expect(skill).toContain('collapsed prompt-only preview')
    expect(skill).toContain('Direction Layer undefined/true remains on')
    expect(contract).toContain('one numbered entry per provider-native shot')
    expect(contract).toContain('Full request X-Ray data remains developer-exclusive')
  })

  it('locks project-wide deletion, editable rename hit-testing, exact reference budgets, and extended zoom', () => {
    expect(skill).toContain('warn with the affected Canvas-instance count')
    expect(skill).toContain('Never leave a runtime cache that can restore deleted media')
    expect(contract).toContain('removes every instance from all Canvases and Pages in the project')
    expect(contract).toContain('No in-memory page/cache copy may restore a deleted asset')
    expect(skill).toContain('hover-toolbar Rename never count as Focus')
    expect(contract).toContain('Double-click Focus remains available only on non-interactive node content')
    expect(skill).toContain('GPT Image 2 Edit `16`')
    expect(skill).toContain('never impersonate Character, Element, Location, or Style')
    expect(contract).toContain('single-image FLUX Kontext Pro `1`')
    expect(contract).toContain('shared maximum zoom is `4.4×`')
  })
})
