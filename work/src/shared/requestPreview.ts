import type { GenerationRequest } from './types'

const commonControlKeys = ['connectionRules', 'quantity'] as const
const controlKeysByKind: Partial<Record<GenerationRequest['kind'], readonly (keyof GenerationRequest)[]>> = {
  'image-generator': ['aspectRatio', 'outputFormat', 'imageResolution', 'imageProvider', 'imageModelId', 'safetyTolerance', 'enableWebSearch', 'inferenceSteps', 'guidanceScale', 'acceleration', 'seed'],
  'image-editor': ['outputFormat', 'imageResolution', 'imageProvider', 'imageModelId', 'safetyTolerance', 'enableWebSearch', 'guidanceScale', 'seed'],
  upscaler: ['upscalerModel', 'scale', 'creativity', 'resemblance', 'inferenceSteps', 'seed'],
  'video-generator': ['videoEngine', 'aspectRatio', 'duration', 'frameRate', 'motionCadence', 'shutterMode', 'shutterAngle', 'generateAudio', 'resolution', 'bitrateMode', 'videoQuality', 'videoWriteMode', 'negativePrompt', 'safetyTolerance', 'autoFix', 'inferenceSteps', 'guidanceScale', 'acceleration', 'interpolatorModel', 'numInterpolatedFrames', 'adjustFpsForInterpolation', 'enablePromptExpansion', 'enableInputSafety', 'enableOutputSafety', 'shift', 'seed'],
  voiceover: ['voice', 'voiceEngine', 'fishModel', 'fishReferenceId', 'fishTemperature', 'fishTopP', 'fishVolume', 'fishNormalizeLoudness', 'fishNormalize', 'fishChunkLength', 'fishFormat', 'fishSampleRate', 'fishMp3Bitrate', 'fishOpusBitrate', 'fishLatency', 'stability', 'similarityBoost', 'speed', 'languageCode', 'textNormalization', 'audioOutputFormat', 'previousText', 'nextText', 'voiceSeed', 'voiceTimestamps'],
  'sound-effects': ['duration', 'loop', 'promptInfluence', 'audioOutputFormat'],
  'music-generator': ['duration', 'forceInstrumental', 'audioOutputFormat'],
}

export function providerEffectiveRequestControls(request: GenerationRequest): Record<string, unknown> {
  if (request.kind === 'upscaler' && request.upscalerModel === 'realesrgan-video') {
    return Object.fromEntries((['connectionRules', 'quantity', 'upscalerModel', 'scale'] as const).flatMap((key) => request[key] === undefined ? [] : [[key, request[key]]]))
  }
  const keys = [...commonControlKeys, ...(controlKeysByKind[request.kind] || [])]
  return Object.fromEntries(keys.flatMap((key) => request[key] === undefined ? [] : [[key, request[key]]]))
}

export function providerRouteLabel(request: GenerationRequest, imageModel?: string): string {
  if (request.kind === 'voiceover') return request.voiceEngine === 'fish-audio' ? `fish-audio/${request.fishModel || 's2-pro'}` : 'fal-ai/elevenlabs/tts/eleven-v3'
  if (request.kind === 'sound-effects') return 'fal-ai/elevenlabs/sound-effects/v2'
  if (request.kind === 'music-generator') return 'fal-ai/elevenlabs/music'
  if (request.kind === 'upscaler') return request.upscalerModel === 'realesrgan-video' ? 'fal-ai/video-upscaler' : 'fal-ai/clarity-upscaler'
  return request.videoEngine || imageModel || request.imageModelId || 'Automatic'
}
