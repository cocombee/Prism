/** Existing provider section names only; this leaf never compiles or rewrites text. */
const SECTION_HEADINGS = new Set([
  'ACTIVE REFERENCES', 'ASSISTANT TASK', 'AUDIO', 'AUTHORED CONTINUITY',
  'CAMERA', 'CAMERA AND LENS', 'CAMERA POSITION AND OPTICS', 'CAMERA, FRAMING, AND OPTICAL HARD GATE',
  'CHARACTER ACTING', 'CONTINUITY', 'EDIT CONTROL', 'EDITABLE VARIABLE REGISTRY',
  'FILMIC MOTION RENDERING', 'FINAL-FRAME AND OUTPUT HARD GATE', 'FIRST FRAME',
  'FORMAT', 'FORMAT MODE', 'FORMAT AND CUTS', 'HARD AVOID', 'IDENTITY AND ANATOMY CONTINUITY',
  'LENS AND OPTICS', 'LIGHTING', 'LIGHTING AND LOOK', 'LIGHTING & INTEGRATION',
  'LINE ATTRIBUTION', 'LOCATION MAP', 'LOOK AND CAPTURE CHARACTER', 'NATURAL SKIN TEXTURE',
  'NEGATIVE PROMPT', 'OPENING-FRAME HARD LOCK', 'OPTICS', 'PERFORMANCE', 'PHYSICS',
  'POSITIVE CONSTRAINTS', 'POSITIVE LOCKS', 'QUALITY', 'REFERENCE AUTHORITY', 'REFERENCE MAP',
  'REFERENCE ROLES', 'REFERENCE INTRODUCTIONS', 'SCENE CONTEXT', 'SCENE, VEHICLE, AND ENVIRONMENT CONTINUITY', 'SCRIPTED DIALOGUE',
  'STATE LEDGER', 'STYLE', 'STYLE PREFIX', 'SUBJECT AND PERFORMANCE',
  'TIMELINE AND CONTINUOUS ACTION', 'VOICES', 'WARDROBE, ACCESSORY, AND PROP CONTINUITY',
  'WORLD AND LIGHTING',
])

type Boundary = { heading: string; line: number; malformed?: boolean }

function exactHeading(line: string): string | undefined {
  const upper = line.trim().toUpperCase()
  if (SECTION_HEADINGS.has(upper)) return upper
  // Inline colon content is supported by the existing authored-field parser.
  const colon = upper.indexOf(':')
  if (colon >= 0) {
    const heading = upper.slice(0, colon).trim()
    if (SECTION_HEADINGS.has(heading)) return heading
  }
  // This camera form is explicitly recognized by existing authored masters.
  if (/^CAMERA[ \t]+—(?:[ \t]|$)/.test(upper)) return 'CAMERA'
  const numbered = upper.match(/^(SHOT[ \t]+[1-9]\d*(?:[ \t]*\/[ \t]*BEAT[ \t]+[1-9]\d*)?|(?:BEAT|CUT|PANEL)[ \t]+[1-9]\d*)(?=$|[ \t]*[:·—-])/)
  return numbered?.[1]
}

function malformedHeading(line: string): string | undefined {
  let text = line.trim(), wrapped = false
  // Explicit heading markup is not supported plain-heading syntax. Unwrap
  // bounded known markup for diagnostics only; delivered text stays untouched.
  // Quoted prose, bullets and arbitrary uppercase exclusions are not headings.
  for (let depth = 0; depth < 4; depth++) {
    const next = text.match(/^#{1,6}[ \t]+(.+)$/)?.[1]
      ?? text.match(/^\[([^\]]+)\](?:[ \t]*:.*)?$/)?.[1]
      ?? text.match(/^(\*\*|__|\*|_|`)(.+)\1(?:[ \t]*:.*)?$/)?.[2]
    if (next === undefined) break
    text = next.trim(); wrapped = true
  }
  if (wrapped) {
    const heading = exactHeading(text)
    if (heading) return heading
  }
  // Extra internal whitespace is not silently accepted/normalized into a
  // reserved static heading; expose that explicit malformed boundary instead.
  const normalized = text.replace(/[ \t]+/g, ' ')
  if (normalized !== text) {
    const heading = exactHeading(normalized)
    if (heading) return heading
  }
  // Detect narrowly bounded negative-heading lookalikes, not prose mentions.
  const near = text.match(/^NEGATIVE[ \t]+PROMPTS?(?:[ \t]*[.:][ \t]*(.*))?$/i)
  if (near && !exactHeading(text)) return 'NEGATIVE PROMPT'
  return undefined
}

/** Inspect final-section boundaries only. Authored/Manual ownership is the caller's policy. */
export function seedanceFinalSectionErrors(body: string): string[] {
  const boundaries: Boundary[] = []
  body.split(/\r\n|\n|\r/).forEach((line, index) => {
    const heading = exactHeading(line)
    if (heading) boundaries.push({ heading, line: index + 1 })
    else {
      const malformed = malformedHeading(line)
      if (malformed) boundaries.push({ heading: malformed, line: index + 1, malformed: true })
    }
  })
  const negatives = boundaries.filter(boundary => boundary.heading === 'NEGATIVE PROMPT' && !boundary.malformed)
  const errors: string[] = []
  if (!negatives.length) errors.push('NEGATIVE PROMPT is required as an exact section heading.')
  if (negatives.length > 1) errors.push(`NEGATIVE PROMPT must occur once; found headings at lines ${negatives.map(boundary => boundary.line).join(', ')}.`)
  for (const heading of ['REFERENCE ROLES', 'REFERENCE INTRODUCTIONS']) {
    if (boundaries.filter(boundary => boundary.heading === heading && !boundary.malformed).length > 1) errors.push(`${heading} must occur once.`)
  }
  for (const boundary of boundaries) {
    if (boundary.malformed && (boundary.heading === 'NEGATIVE PROMPT' || negatives.length && boundary.line > negatives[0].line)) {
      errors.push(`Unsupported section-heading syntax at line ${boundary.line}: ${boundary.heading}. Preserve the authored text for review; it was not rewritten.`)
    } else if (!boundary.malformed && negatives.length && boundary.line > negatives[0].line && boundary.heading !== 'NEGATIVE PROMPT') {
      errors.push(`NEGATIVE PROMPT must be the final section; ${boundary.heading} follows at line ${boundary.line}.`)
    }
  }
  return errors
}
