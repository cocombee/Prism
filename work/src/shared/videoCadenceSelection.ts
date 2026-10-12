import { visualMotionCadenceInstruction } from './filmicMotion'
import { findVideoModel } from './videoModels'

export type VideoCadenceMode = 'native' | 'custom'

/** Explicit footer selection adds intent without editing the authored User text. */
export function userPromptWithCadence(text: string, mode: VideoCadenceMode | undefined, cadence: number | undefined): string {
  return mode === 'custom' && cadence !== undefined && text.trim()
    ? `${text}\n\nMOTION CADENCE: ${visualMotionCadenceInstruction(cadence)}`
    : text
}

/** Verified output rates, not fabricated provider input fields. */
export function verifiedNativeVideoFrameRate(endpointId: string): number | undefined {
  // Alibaba's official Wan3.0 guide: wan3.0-video and wan3.0-video-prime output 30fps.
  if (/^alibaba\/wan-3\.0(?:-prime)?\/(?:text-to-video|image-to-video|reference-to-video)$/.test(endpointId)) return 30
  // Alibaba's current model table declares Wan2.7 T2V/I2V/R2V output at30fps.
  // https://www.alibabacloud.com/help/en/model-studio/video-generate-edit-model/
  if (/^(?:fal-ai\/)?wan\/v2\.7\/(?:text-to-video|image-to-video|reference-to-video)$/.test(endpointId)) return 30
  // fal's exact Seedance2.5 token formula uses24; accepted draft/final both decode at24.
  if (/^bytedance\/seedance-2\.5\/(?:text-to-video|image-to-video|reference-to-video)$/.test(endpointId)) return 24
  // Google's current Veo3.1/Fast/Lite model table declares24fps output.
  // Exact registered routes only: https://ai.google.dev/gemini-api/docs/veo
  const registered = findVideoModel(endpointId)
  if (registered?.family === 'veo' && registered.id === endpointId) return registered.fixedFrameRate
  return undefined
}

export function nativeFpsLabel(fps: number | undefined): string {
  return fps === undefined ? 'Provider FPS (Native)' : `${fps} fps (Native)`
}

/** Current declared FPS selection/default wins verified fixed endpoint metadata. */
export function nativeVideoOutputFrameRate(endpointId: string, declaredValue?: unknown): number | undefined {
  const fps = typeof declaredValue === 'number' ? declaredValue
    : typeof declaredValue === 'string' && declaredValue.trim() ? Number(declaredValue) : NaN
  return Number.isFinite(fps) && fps > 0 ? fps : verifiedNativeVideoFrameRate(endpointId)
}
