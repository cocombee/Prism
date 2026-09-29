import type { CharacterView } from './types'

export type CharacterCompletionView = {
  id: CharacterView
  label: string
  framing: string
}

export const CHARACTER_COMPLETION_VIEWS: CharacterCompletionView[] = [
  { id: 'front', label: 'Face', framing: 'close face view at exactly 0-degree yaw, looking straight ahead, both eyes and both ears balanced, neutral expression; not three-quarter and not profile' },
  {
    id: 'three-quarter',
    label: 'Right Three-Quarter',
    framing: 'close face view, head yaw exactly 45 degrees toward camera-right, both eyes visible, far cheek visibly foreshortened; not frontal and not near-profile',
  },
  { id: 'profile', label: 'Profile', framing: 'close face view at exactly 90-degree yaw facing left, only the near eye visible, nose, lips, and chin forming a clean side silhouette; no far eye visible, not frontal and not three-quarter' },
  { id: 'full-body', label: 'Full Body Front', framing: 'full body view at exactly 0-degree yaw, facing straight ahead, head to toe fully visible, neutral standing pose; not portrait-cropped and not three-quarter' },
  { id: 'back', label: 'Back Face', framing: 'close back-of-head view at exactly 180-degree yaw, both ears balanced where visible and no facial features visible; not side and not three-quarter' },
  { id: 'smile', label: 'Smiling', framing: 'close face view at exactly 0-degree yaw with a natural open smile showing identity-specific teeth and lip asymmetry; visibly different expression from the neutral Face panel' },
  {
    id: 'left-three-quarter',
    label: 'Left Three-Quarter',
    framing: 'close face view, head yaw exactly 45 degrees toward camera-left, both eyes visible, far cheek visibly foreshortened; opposite side from Right Three-Quarter',
  },
  { id: 'side-body', label: 'Side Body', framing: 'full body true side profile at exactly 90-degree yaw facing left, head to toe fully visible, feet and shoulders aligned in profile, neutral standing pose; not three-quarter' },
  { id: 'full-body-back', label: 'Back Body', framing: 'full body straight rear view at exactly 180-degree yaw, back of head to heels fully visible, shoulders and feet facing away, neutral standing pose; no facial features and not three-quarter' },
]

export function characterCompletionPrompt(target: CharacterCompletionView, supplied: CharacterView[], guidance = ''): string {
  const suppliedLabels = supplied
    .map((id) => CHARACTER_COMPLETION_VIEWS.find((view) => view.id === id)?.label || id)
    .join(', ')
  const smileException = target.id === 'smile'
    ? 'Smile intentionally shares the Face panel camera axis, but its natural smile and visible teeth must make it unmistakably different from the neutral Face panel.'
    : 'The target camera angle and crop must be unmistakably different from every supplied panel with a different assigned view.'

  return [
    'HARD CHARACTER IDENTITY SHEET RULE.',
    'Treat @front-face as the canonical identity anchor and every supplied panel as identity evidence for the same person.',
    'Preserve exact facial geometry, apparent age, skin tone, hairline, hair texture, eye shape, nose, mouth, ears, body proportions, wardrobe, accessories, and distinguishing details.',
    `Generate exactly one missing assigned panel: ${target.label}.`,
    `Required camera geometry and framing: ${target.framing}.`,
    `Panels already supplied or completed: ${suppliedLabels || 'none'}. Do not recreate, replace, copy, or mirror any supplied panel.`,
    smileException,
    'Rotate the same three-dimensional person to the required camera-relative orientation; never fake a new angle by horizontally mirroring an existing image.',
    'Before returning the image, verify that the assigned view is identifiable from eye visibility, facial silhouette, shoulder direction, and crop without reading a label. If it resembles another assigned panel, correct the yaw, expression, or framing.',
    'Produce one clean view only with neutral, consistent studio lighting and a plain unobtrusive background. Do not combine views, add a second person, redesign clothing, add props, add text, or add borders.',
    guidance.trim() ? `User character guidance: ${guidance.trim()}` : '',
  ].filter(Boolean).join(' ')
}

export function singleCharacterSheetPrompt(guidance = ''): string {
  const orderedLabels = CHARACTER_COMPLETION_VIEWS.map((view) => view.label).join(', ')
  const panelRequirements = CHARACTER_COMPLETION_VIEWS
    .map((view, index) => `Panel ${index + 1} — ${view.label}: ${view.framing}.`)
    .join(' ')

  return [
    'HARD CHARACTER IDENTITY SHEET RULE.',
    'Generate exactly one image containing a 3-by-3 Character reference sheet.',
    `Use this exact left-to-right, top-to-bottom order: ${orderedLabels}.`,
    panelRequirements,
    'Treat an attached source image as the canonical identity anchor when one is supplied.',
    'Preserve exact facial geometry, apparent age, skin tone, hairline, hair texture, eye shape, nose, mouth, ears, body proportions, wardrobe, accessories, and distinguishing details; all nine panels belong to the exact same person.',
    'Use neutral, consistent studio lighting and one plain unobtrusive background across the sheet. Keep each panel clearly separated and fully visible.',
    'Do not redesign, beautify, age-shift, change ethnicity, change clothing, add props, add another person, omit a panel, duplicate an angle, or mirror one angle to fake another.',
    'Return one composite image only. Do not return nine separate files.',
    guidance.trim() ? `User character guidance: ${guidance.trim()}` : '',
  ].filter(Boolean).join(' ')
}
