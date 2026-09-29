export interface StylePreset {
  id: string
  title: string
  description: string
  prompt: string
  thumbnail: string
  /** Explicit subject-aware crop used by every compact and expanded preview. */
  focalPosition: string
}

export const STYLE_PRESETS: readonly StylePreset[] = [
  {
    id: 'cinematic-naturalism',
    title: 'Kodak',
    description: 'Raw 35mm anamorphic Kodak texture, tactile grain, halation, and motivated practical light.',
    prompt: 'LOOK-ONLY KODAK AUTHORITY. Capture on 35mm motion-picture film in 2.39:1 anamorphic widescreen with a 2x squeeze and motivated handheld physical-operator texture. Use a 35mm anamorphic lens with natural mild-wide character, oval bokeh, subtle horizontal flare streaks, and soft anamorphic edges. Hold f/2.0 with shallow depth of field and imperfect focus recovery after abrupt subject or operator motion. Grade with a cold blue-grey base against dirty amber practical light, low saturation, lifted textured blacks, a gentle low-contrast film-print S-curve, compressed highlight roll-off, warm halation, heavy organic 35mm grain, and subtle gate weave. Preserve tactile skin, fabric, architecture, practical-light texture, hard moving shadows, atmospheric realism, and an unpolished physically photographed feel. This is look authority only; the downstream compiler owns all shot mechanics.',
    thumbnail: './style-thumbnails/cinematic-naturalism.jpg',
    focalPosition: 'center top',
  },
  {
    id: 'dimensional-comic',
    title: 'Dimensional Comic',
    description: 'Bold ink, graphic depth, halftone texture, and energetic comic-book perspective.',
    prompt: 'Render every storyboard panel as original dimensional comic animation. Preserve all connected identities, locations, props, actions, and shot continuity while translating them into bold variable ink contours, graphic shape language, halftone and screen-tone shadows, offset CMYK registration, layered 2D-and-3D depth, angular perspective, selective speed lines, expressive foreshortening, punchy cyan-magenta-yellow accents, and tactile print texture. Keep faces readable and silhouettes decisive. Do not reproduce any existing comic franchise, named character, logo, costume, or exact trade dress. No text, speech balloons, captions, or watermarks. For unspecified people, use adult men or modestly dressed women in hijab and loose, non-revealing clothing.',
    thumbnail: './style-thumbnails/dimensional-comic.jpg',
    focalPosition: 'center 34%',
  },
  {
    id: 'heroic-panel-comics',
    title: 'Heroic Panel Comics',
    description: 'Classic heroic ink, four-color halftones, grounded anatomy, and dramatic panel perspective.',
    prompt: 'Render every storyboard panel as original heroic four-color comic illustration. Preserve all connected identities, ages, locations, props, actions, framing intent, and continuity. Use disciplined grounded anatomy, clean variable-width contour lines, decisive solid-black shadow shapes, flat local colors, restrained four-color offset printing, fine halftone modeling, subtle registration character, dramatic low-angle perspective, crisp architectural linework, confident heroic staging, sequential-panel clarity, and lightly aged off-white paper grain. Keep faces recognizable, proportions believable, silhouettes readable, and every costume wholly original with clean geometric panel seams. Do not copy or evoke any existing publisher, franchise, artist, superhero, signature costume, emblem, mask, logo, character, or trade dress. No web motifs, text, speech balloons, captions, borders, or watermarks. For unspecified people, use adult men or modestly dressed women wearing hijab and loose, non-revealing clothing.',
    thumbnail: './style-thumbnails/heroic-panel-comics.png',
    focalPosition: 'center top',
  },
  {
    id: 'painterly-martial-arts',
    title: 'Painterly Martial Arts',
    description: 'Expressive ink-and-gouache action with warm color and handcrafted atmosphere.',
    prompt: 'Render every storyboard panel as original painterly martial-arts animation. Preserve the connected subject identity, action, environment, props, and continuity. Use expressive hand-painted ink-and-gouache backgrounds, elegant brush contours, dynamic readable poses, warm jade and ochre color harmony, atmospheric mountain depth, carved wood and paper-lantern detail, controlled animation lighting, selective texture, and energetic staging with clear arcs of motion. Keep the result cinematic, warm, and handcrafted without copying any named animated film, studio, character, costume, or franchise. No text, logos, or watermarks. Human characters without references must be adult men or modestly dressed women wearing hijab and loose, non-revealing clothing.',
    thumbnail: './style-thumbnails/painterly-martial-arts.jpg',
    focalPosition: 'center 32%',
  },
  {
    id: 'film-noir',
    title: 'Classic Film Noir',
    description: 'Monochrome chiaroscuro, deep shadows, silver highlights, and classic 35mm grain.',
    prompt: 'Apply a classic film-noir visual system consistently to every storyboard panel while preserving all connected subjects, locations, props, actions, and continuity. Use monochrome photography, severe chiaroscuro, low-key hard key light, deep blacks, bright silver highlights, oblique or low camera angles where appropriate, venetian-blind shadow bands, rain-slick reflections, atmospheric haze, architectural shadow geometry, restrained practical light, and authentic 35mm grain. Maintain readable faces and motivated lighting rather than crushing essential detail. No modern neon color, text, logos, or watermarks. For unspecified people, use adult men or modestly dressed women wearing hijab and loose, non-revealing clothing.',
    thumbnail: './style-thumbnails/film-noir.jpg',
    focalPosition: 'center 50%',
  },
  {
    id: 'storybook-gouache',
    title: 'Storybook Gouache',
    description: 'Soft painted shapes, tactile brushwork, and warm illustrated-storybook charm.',
    prompt: 'Translate every storyboard panel into an original storybook-gouache fantasy while preserving connected characters, locations, props, actions, camera intent, and panel-to-panel continuity. Use visible dry-brush texture, layered painted shapes, simplified expressive silhouettes, tactile paper-like foliage, warm amber, moss, cream, and muted teal colors, whimsical but coherent scale, soft painted light, gentle atmospheric perspective, and charming illustrated-book composition. Keep forms readable and avoid photoreal surfaces or generic digital gloss. Do not imitate any named illustrator or existing character. No text, logos, borders, or watermarks. For unspecified people, use boys or adult men, or modestly dressed girls and women wearing hijab and loose, non-revealing clothing.',
    thumbnail: './style-thumbnails/storybook-gouache.jpg',
    focalPosition: 'center 38%',
  },
  {
    id: 'retro-35mm',
    title: 'Vintage 35mm',
    description: 'Sun-faded film color, gentle halation, organic grain, and nostalgic realism.',
    prompt: 'Apply a vintage 35mm road-movie look consistently across every storyboard panel while preserving connected identities, locations, vehicles, props, actions, framing, and continuity. Use late-1970s color-negative character, sun-faded teal and warm amber, halation around bright practical highlights, organic grain, gentle gate-weave character, a soft period lens, lifted blacks, imperfect candid framing, natural skin texture, practical locations, and nostalgic production detail. Keep the image realistic rather than sepia or costume-like. Avoid modern digital sharpness, heavy filters, text, logos, and watermarks. For people introduced without references, default to adult men or modestly dressed women wearing hijab and loose, non-revealing clothing; no exposed hair for women, cleavage, transparent fabric, or skin-tight wardrobe.',
    thumbnail: './style-thumbnails/retro-35mm.jpg',
    focalPosition: 'center 12%',
  },
]

function normalizedPresetIdentity(value: string | undefined): string {
  return (value || '').trim().replace(/^@+/, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-')
}

/**
 * Resolves both current and legacy built-in selections without materializing a
 * private prompt into saved node state. The provider pipeline may consume the
 * returned prompt; customer-facing surfaces must redact it.
 */
export function resolveBuiltInStylePreset(selection: {
  stylePresetId?: string
  referenceTag?: string
  title?: string
}): StylePreset | undefined {
  const identities = new Set([
    normalizedPresetIdentity(selection.stylePresetId),
    normalizedPresetIdentity(selection.referenceTag),
    normalizedPresetIdentity(selection.title),
  ].filter(Boolean))
  return STYLE_PRESETS.find((preset) => identities.has(normalizedPresetIdentity(preset.id)) || identities.has(normalizedPresetIdentity(preset.title)))
}

/**
 * Built-in Style instructions are product-owned implementation details. The
 * runtime must receive them, but user-facing X-ray/inspection surfaces must
 * prove that a Style was applied without disclosing the private prompt.
 */
export function redactBuiltInStylePrompts(value: string, materializedPresetPrompts: readonly string[] = []): string {
  const presetSecrets = [
    ...STYLE_PRESETS.map((preset) => ({ title: preset.title, prompt: preset.prompt })),
    ...materializedPresetPrompts.map((prompt) => ({ title: 'Selected', prompt })),
  ]
  return presetSecrets.reduce((redacted, preset) => {
    const secret = preset.prompt.trim()
    return secret ? redacted.replaceAll(secret, `[${preset.title} built-in Style instructions applied]`) : redacted
  }, value)
}

export interface PrivateStyleInjectionAudit {
  presetId: string
  title: string
  injectedIntoFinalPrompt: boolean
  affectedStoryboardShots: number
  instructionCharacters: number
  fingerprint: string
  disclosure: 'Private Built-In Instructions'
}

function instructionFingerprint(value: string): string {
  // A small deterministic diagnostic fingerprint proves which private payload
  // was used without making the bundled instruction reversible in the UI.
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `pf-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function auditPrivateStyleInjections(
  finalPrompt: string,
  storyboardShotPrompts: readonly string[],
  styles: readonly { presetId: string; title: string; prompt: string }[],
): PrivateStyleInjectionAudit[] {
  return styles.flatMap((style) => {
    const instruction = style.prompt.trim()
    if (!instruction) return []
    const injectedIntoFinalPrompt = finalPrompt.includes(instruction)
    const affectedStoryboardShots = storyboardShotPrompts.filter((prompt) => prompt.includes(instruction)).length
    if (!injectedIntoFinalPrompt && !affectedStoryboardShots) return []
    return [{
      presetId: style.presetId,
      title: style.title,
      injectedIntoFinalPrompt,
      affectedStoryboardShots,
      instructionCharacters: instruction.length,
      fingerprint: instructionFingerprint(instruction),
      disclosure: 'Private Built-In Instructions' as const,
    }]
  })
}
