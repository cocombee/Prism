import { describe, expect, it } from 'vitest'
import { auditPrivateStyleInjections, redactBuiltInStylePrompts, resolveBuiltInStylePreset, STYLE_PRESETS } from './stylePresets'

describe('built-in Style privacy', () => {
  it('resolves current IDs and legacy canonical tags or titles', () => {
    expect(resolveBuiltInStylePreset({ stylePresetId: 'dimensional-comic' })?.id).toBe('dimensional-comic')
    expect(resolveBuiltInStylePreset({ referenceTag: '@dimensional-comic' })?.id).toBe('dimensional-comic')
    expect(resolveBuiltInStylePreset({ title: 'Dimensional Comic' })?.id).toBe('dimensional-comic')
  })
  it('keeps every compact and expanded crop on its audited subject-safe focal point', () => {
    expect(Object.fromEntries(STYLE_PRESETS.map((preset) => [preset.id, preset.focalPosition]))).toEqual({
      'cinematic-naturalism': 'center top',
      'dimensional-comic': 'center 34%',
      'heroic-panel-comics': 'center top',
      'painterly-martial-arts': 'center 32%',
      'film-noir': 'center 50%',
      'storybook-gouache': 'center 38%',
      'retro-35mm': 'center 12%',
      'handcrafted-paper-sculpture': 'center top',
    })
  })

  it('keeps the built-in visual languages distinct and their original prompt anchors intact', () => {
    const expectedPromptAnchors: Record<string, readonly string[]> = {
      'cinematic-naturalism': ['35mm motion-picture film', '2.39:1 anamorphic widescreen', 'heavy organic 35mm grain', 'subtle gate weave'],
      'dimensional-comic': ['layered 2D-and-3D depth', 'offset CMYK registration'],
      'heroic-panel-comics': ['disciplined grounded anatomy', 'restrained four-color offset printing'],
      'painterly-martial-arts': ['ink-and-gouache backgrounds', 'warm jade and ochre'],
      'film-noir': ['severe chiaroscuro', 'bright silver highlights'],
      'storybook-gouache': ['visible dry-brush texture', 'tactile paper-like foliage'],
      'retro-35mm': ['late-1970s color-negative character', 'gentle gate-weave character'],
      'handcrafted-paper-sculpture': ['layered matte cardstock', 'blank except for one small paper mouth', 'No eyes, eye dots', 'rather than woven fabric'],
    }
    expect(STYLE_PRESETS.map((preset) => preset.id)).toEqual(Object.keys(expectedPromptAnchors))
    for (const preset of STYLE_PRESETS) {
      for (const anchor of expectedPromptAnchors[preset.id]) expect(preset.prompt).toContain(anchor)
    }
    expect(new Set(STYLE_PRESETS.map((preset) => preset.prompt)).size).toBe(STYLE_PRESETS.length)
  })

  it('keeps Kodak look-only without fixed cadence, timecode, FOV, or camera-angle authority', () => {
    const kodak = STYLE_PRESETS.find((preset) => preset.id === 'cinematic-naturalism')!.prompt
    expect(kodak).toContain('35mm motion-picture film')
    expect(kodak).not.toMatch(/\b24\s*fps\b|\b1\/48|\bFOV\b|\btimecode\b|\bcamera angle\b/i)
  })

  it('keeps Heroic Panel Comics original and copyright-safe', () => {
    const preset = STYLE_PRESETS.find((candidate) => candidate.id === 'heroic-panel-comics')!
    expect(preset.title).toBe('Heroic Panel Comics')
    expect(preset.thumbnail).toBe('./style-thumbnails/heroic-panel-comics.png')
    expect(preset.focalPosition).toBe('center top')
    expect(preset.prompt).toContain('every costume wholly original')
    expect(preset.prompt).toContain('Do not copy or evoke any existing publisher, franchise, artist, superhero')
    expect(`${preset.title} ${preset.description} ${preset.prompt}`).not.toMatch(/Marvel|Spider[ -]?Man|DC Comics|Stan Lee|Kirby/i)
  })

  it('provides a concise public description without exposing the private prompt', () => {
    for (const preset of STYLE_PRESETS) {
      expect(preset.description.trim().length).toBeGreaterThan(20)
      expect(preset.description.length).toBeLessThanOrEqual(100)
      expect(preset.prompt).not.toContain(preset.description)
    }
  })

  it('keeps runtime prompts available while redacting them from user-facing X-ray text', () => {
    const preset = STYLE_PRESETS[0]
    const runtime = `Style Direction @${preset.id}:\n${preset.prompt}\n\nShot 1.`
    const inspected = redactBuiltInStylePrompts(runtime)
    expect(runtime).toContain(preset.prompt)
    expect(inspected).not.toContain(preset.prompt)
    expect(inspected).toContain(`[${preset.title} built-in Style instructions applied]`)
    expect(inspected).toContain('Shot 1.')
  })

  it('redacts a preset prompt materialized by an older saved workflow', () => {
    const legacySecret = 'Legacy built-in visual recipe retained in the saved node.'
    const inspected = redactBuiltInStylePrompts(`Style Direction:\n${legacySecret}\nShot 1.`, [legacySecret])
    expect(inspected).not.toContain(legacySecret)
    expect(inspected).toContain('[Selected built-in Style instructions applied]')
  })

  it('proves private Style injection without disclosing the instruction', () => {
    const preset = STYLE_PRESETS[0]
    const finalPrompt = `Storyboard context\n${preset.prompt}`
    const shots = [`${preset.prompt}\nShot 1`, `${preset.prompt}\nShot 2`]
    const audit = auditPrivateStyleInjections(finalPrompt, shots, [{ presetId: preset.id, title: preset.title, prompt: preset.prompt }])
    expect(audit).toEqual([expect.objectContaining({
      presetId: preset.id,
      title: preset.title,
      injectedIntoFinalPrompt: true,
      affectedStoryboardShots: 2,
      instructionCharacters: preset.prompt.length,
      disclosure: 'Private Built-In Instructions',
    })])
    expect(JSON.stringify(audit)).not.toContain(preset.prompt)
    expect(audit[0].fingerprint).toMatch(/^pf-[0-9a-f]{8}$/)
  })
})
