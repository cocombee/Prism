import type { GenerationRequest } from './types'
import { effectiveVideoEndpoint } from './providerPromptOwnership'

export function structuredSeedanceCoverage(authored: string) {
  const has = (pattern: RegExp) => pattern.test(authored)
  return {
    format: has(/^FORMAT(?: MODE| AND CUTS)?\b/im), shots: has(/^SHOT\s+\d+\b/im), scene: has(/^SCENE CONTEXT\b/im), references: has(/^ACTIVE REFERENCES\b/im),
    camera: has(/^CAMERA\b|^CAMERA\s+—|CAMERA POSITION AND OPTICS/im), optics: has(/\b(?:FOV|LENS|OPTICS)\b/i),
    lighting: has(/^(?:WORLD AND )?LIGHTING\b|^LIGHTING\s*&\s*INTEGRATION/im), style: has(/^STYLE(?: PREFIX)?\b/im),
    continuity: has(/^CONTINUITY\b|\bLOCK\b|^POSITIVE CONSTRAINTS\b/im), performance: has(/^CHARACTER ACTING\b|^VOICES\b|^SCRIPTED DIALOGUE\b|^LINE ATTRIBUTION\b/im),
    physics: has(/^PHYSICS\b/im), audio: has(/^AUDIO\b/im), quality: has(/^QUALITY\b|^POSITIVE CONSTRAINTS\b/im), negative: has(/^NEGATIVE PROMPT\b/im),
  }
}

export function completeStructuredSeedanceMaster(authored: string): boolean {
  if (!authored) return false
  const coverage = structuredSeedanceCoverage(authored)
  return coverage.format && coverage.shots && coverage.scene && coverage.references && coverage.camera && coverage.lighting
    && coverage.style && coverage.continuity && coverage.performance && coverage.physics && coverage.audio && coverage.quality
}

/** Recognized authored masters own their structure; unused typed beats are not compiled. */
export function ownsExactSeedanceMaster(request: GenerationRequest): boolean {
  return request.kind === 'video-generator' && Boolean(effectiveVideoEndpoint(request)?.includes('seedance')) && completeStructuredSeedanceMaster(request.authoredPrompt || '')
}
