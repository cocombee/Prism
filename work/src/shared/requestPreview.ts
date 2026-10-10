import { directImageControls } from './directImageControls'
import { compileFishAudioRequest } from './fishAudio'
import { isElevenDialogue, dialoguePromptText } from './elevenDialogue'
import type { GenerationRequest } from './types'
import { compileElevenAudioRequest, isDirectElevenAudio, type ElevenSpeechModel } from './elevenLabsAudio'

/** Text sent by the current audio adapters, without visual prompt compilation.
 * Native ElevenLabs and Fish preserve authored bytes; fal audio trims only
 * outer whitespace. Video-only providerPromptOverride is not an audio input.
 */
export function providerAudioPromptText(request: GenerationRequest): string | undefined {
  if (request.falNative && ['voiceover', 'sound-effects'].includes(request.kind)) return request.prompt
  if (!['voiceover', 'sound-effects', 'music-generator'].includes(request.kind)) return undefined
  const authored = isElevenDialogue(request) ? dialoguePromptText(request.elevenDialogueTurns) : request.prompt || ''
  if (!authored.trim()) throw new Error('Add audio text before generating.')
  return isDirectElevenAudio(request) || request.voiceEngine === 'fish-audio' ? authored : authored.trim()
}

const commonControlKeys = ['connectionRules', 'quantity'] as const
const controlKeysByKind: Partial<Record<GenerationRequest['kind'], readonly (keyof GenerationRequest)[]>> = {
  'image-generator': ['aspectRatio', 'outputFormat', 'imageResolution', 'imageProvider', 'imageModelId', 'safetyTolerance', 'enableWebSearch', 'inferenceSteps', 'guidanceScale', 'acceleration', 'seed'],
  'image-editor': ['outputFormat', 'imageResolution', 'imageProvider', 'imageModelId', 'safetyTolerance', 'enableWebSearch', 'guidanceScale', 'seed'],
  upscaler: ['upscalerModel', 'scale', 'creativity', 'resemblance', 'inferenceSteps', 'seed'],
  'video-generator': ['videoEngine', 'aspectRatio', 'duration', 'frameRate', 'motionCadence', 'shutterMode', 'shutterAngle', 'generateAudio', 'resolution', 'bitrateMode', 'videoQuality', 'videoWriteMode', 'negativePrompt', 'safetyTolerance', 'autoFix', 'inferenceSteps', 'guidanceScale', 'acceleration', 'interpolatorModel', 'numInterpolatedFrames', 'adjustFpsForInterpolation', 'enablePromptExpansion', 'enableInputSafety', 'enableOutputSafety', 'shift', 'seed'],
  voiceover: ['voice', 'voiceEngine', 'voiceModelId', 'voiceStyle', 'fishModel', 'fishReferenceId', 'fishTemperature', 'fishTopP', 'fishVolume', 'fishNormalizeLoudness', 'fishNormalize', 'fishChunkLength', 'fishFormat', 'fishSampleRate', 'fishMp3Bitrate', 'fishOpusBitrate', 'fishLatency', 'stability', 'similarityBoost', 'speed', 'languageCode', 'textNormalization', 'audioOutputFormat', 'previousText', 'nextText', 'voiceSeed', 'voiceTimestamps'],
  'sound-effects': ['audioProvider', 'duration', 'loop', 'promptInfluence', 'audioOutputFormat'],
  'music-generator': ['duration', 'forceInstrumental', 'audioOutputFormat'],
}

export function providerEffectiveRequestControls(request: GenerationRequest, speechModel?: ElevenSpeechModel): Record<string, unknown> {
  if (request.falNative) return { model_id: request.falNative.endpointId, ...Object.fromEntries(Object.entries(request.falNative.values).filter(([key]) => key !== request.falNative!.promptField)), ...request.falNative.media }
  if (['image-generator', 'image-editor'].includes(request.kind) && (request.imageProvider === 'openai' || request.imageProvider === 'google')) return directImageControls(request)
  if (request.kind === 'voiceover' && request.voiceEngine === 'fish-audio') {
    const { modelId, body } = compileFishAudioRequest(request)
    const { text: _text, ...controls } = body
    return { model: modelId, ...controls, ...(request.quantity !== undefined ? { quantity: request.quantity } : {}) }
  }
  if (isDirectElevenAudio(request)) {
    const compiled = compileElevenAudioRequest(request, speechModel)
    const { text: _text, ...controls } = compiled.body
    return { ...controls, output_format: compiled.outputFormat, ...(request.quantity !== undefined ? { quantity: request.quantity } : {}) }
  }
  if (request.kind === 'upscaler' && request.upscalerModel === 'realesrgan-video') {
    return Object.fromEntries((['connectionRules', 'quantity', 'upscalerModel', 'scale'] as const).flatMap((key) => request[key] === undefined ? [] : [[key, request[key]]]))
  }
  const keys = [...commonControlKeys, ...(controlKeysByKind[request.kind] || [])]
  return Object.fromEntries(keys.flatMap((key) => request[key] === undefined ? [] : [[key, request[key]]]))
}

export function providerRouteLabel(request: GenerationRequest, imageModel?: string): string {
  if (request.kind === 'voiceover' && request.voiceEngine === 'elevenlabs-direct') return `elevenlabs/${request.voiceModelId || 'Select a speech model'}${isElevenDialogue(request) ? '/dialogue' : ''}`
  if (request.kind === 'sound-effects' && request.audioProvider === 'elevenlabs') return 'elevenlabs/eleven_text_to_sound_v2'
  if (request.kind === 'voiceover') return request.voiceEngine === 'fish-audio' ? `fish-audio/${request.fishModel || 's2-pro'}` : 'fal-ai/elevenlabs/tts/eleven-v3'
  if (request.kind === 'sound-effects') return 'fal-ai/elevenlabs/sound-effects/v2'
  if (request.kind === 'music-generator') return 'fal-ai/elevenlabs/music'
  if (request.kind === 'upscaler') return request.upscalerModel === 'realesrgan-video' ? 'fal-ai/video-upscaler' : 'fal-ai/clarity-upscaler'
  return request.videoEngine || imageModel || request.imageModelId || 'Automatic'
}
