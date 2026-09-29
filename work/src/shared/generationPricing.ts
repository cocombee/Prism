import type { GenerationCostEstimate, GenerationRequest } from './types'
import { FAL_IMAGE_MODELS, generationMediaInputCount, imageDimensionsForTier } from './imageModels'

const GPT_IMAGE_2_EDIT_HIGH_QUALITY = [
  { pixels: 1024 * 768, cost: 0.151 },
  { pixels: 1024 * 1024, cost: 0.219 },
  { pixels: 1024 * 1536, cost: 0.178 },
  { pixels: 1920 * 1080, cost: 0.158 },
  { pixels: 2560 * 1440, cost: 0.234 },
  { pixels: 3840 * 2160, cost: 0.413 },
] as const

function gptImage2EditHighQualityBase(request: GenerationRequest): number {
  const { width, height } = imageDimensionsForTier(request.aspectRatio, request.imageResolution)
  const pixels = width * height
  const exact = GPT_IMAGE_2_EDIT_HIGH_QUALITY.find((entry) => entry.pixels === pixels)
  if (exact) return exact.cost
  const sorted = [...GPT_IMAGE_2_EDIT_HIGH_QUALITY].sort((a, b) => a.pixels - b.pixels)
  const upperIndex = sorted.findIndex((entry) => entry.pixels >= pixels)
  if (upperIndex <= 0) return sorted[0].cost
  if (upperIndex < 0) return sorted[sorted.length - 1].cost
  const lower = sorted[upperIndex - 1]
  const upper = sorted[upperIndex]
  const progress = (pixels - lower.pixels) / (upper.pixels - lower.pixels)
  return lower.cost + (upper.cost - lower.cost) * progress
}

/** Narrow public-price fallback for endpoints whose fal billing lookup may be unavailable to a generation-capable API-scoped key. Verified from official fal model pages on 2026-08-12. */
export function publishedFalEstimate(request: GenerationRequest, modelId: string): GenerationCostEstimate | null {
  const quantity = Math.min(Math.max(request.quantity || 1, 1), 4)
  if (modelId === FAL_IMAGE_MODELS.gptImage2Edit) {
    const base = gptImage2EditHighQualityBase(request)
    const inputCount = Math.max(1, generationMediaInputCount(request))
    // One input image is included in fal's table. Additional high-fidelity inputs retain the
    // project-verified allowance; prompt complexity remains variable and is not speculatively
    // converted from character count into a guaranteed surcharge.
    const additionalInputAllowance = Math.max(0, inputCount - 1) * ((0.52 - 0.151) / 13)
    const perImage = base + additionalInputAllowance
    return {
      modelId,
      totalCost: perImage * quantity,
      currency: 'USD',
      basis: `${quantity} high-quality edit${quantity === 1 ? '' : 's'} · ${request.imageResolution || '1K'} ${request.aspectRatio || 'auto'} · ${inputCount} image input${inputCount === 1 ? '' : 's'} · official size-table interpolation refreshed 2026-08-16`,
      estimated: true,
    }
  }
  if (modelId !== FAL_IMAGE_MODELS.nanoBanana && modelId !== FAL_IMAGE_MODELS.nanoBananaEdit) return null
  const perImage = request.imageResolution === '4K' ? 0.30 : 0.15
  const searchFee = request.enableWebSearch ? 0.015 : 0
  return {
    modelId,
    totalCost: perImage * quantity + searchFee,
    currency: 'USD',
    basis: `${quantity} image${quantity === 1 ? '' : 's'} × ${perImage.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}${searchFee ? ' + $0.015 web search' : ''}`,
    estimated: true,
  }
}
