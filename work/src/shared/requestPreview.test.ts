import { describe, expect, it } from 'vitest'
import { providerEffectiveRequestControls, providerRouteLabel } from './requestPreview'

describe('provider-effective request preview', () => {
  it('shows only music controls and the actual broker route', () => {
    const request = { nodeId: 'music', kind: 'music-generator' as const, duration: 30, forceInstrumental: true, audioOutputFormat: 'mp3_44100_128', outputFormat: 'png' as const, imageResolution: '1K' as const, quantity: 1 }
    expect(providerRouteLabel(request)).toBe('fal-ai/elevenlabs/music')
    expect(providerEffectiveRequestControls(request)).toEqual({ quantity: 1, duration: 30, forceInstrumental: true, audioOutputFormat: 'mp3_44100_128' })
  })

  it('keeps provider-effective upscaler controls without inherited image defaults', () => {
    const request = { nodeId: 'upscale', kind: 'upscaler' as const, scale: 2, creativity: 0.35, resemblance: 0.6, outputFormat: 'png' as const }
    expect(providerRouteLabel(request)).toBe('fal-ai/clarity-upscaler')
    expect(providerEffectiveRequestControls(request)).toEqual({ scale: 2, creativity: 0.35, resemblance: 0.6 })
  })

  it('reports the real fal video upscaler route and its effective scale control', () => {
    const request = { nodeId: 'video-upscale', kind: 'upscaler' as const, upscalerModel: 'realesrgan-video' as const, scale: 4 }
    expect(providerRouteLabel(request)).toBe('fal-ai/video-upscaler')
    expect(providerEffectiveRequestControls(request)).toEqual({ upscalerModel: 'realesrgan-video', scale: 4 })
  })

  it('reports Output FPS and visual Motion Cadence as separate video controls', () => {
    const request = { nodeId: 'video', kind: 'video-generator' as const, videoEngine: 'wan-controlled', frameRate: 24, motionCadence: 16 }
    expect(providerEffectiveRequestControls(request)).toEqual({ videoEngine: 'wan-controlled', frameRate: 24, motionCadence: 16 })
  })

  it('X-rays every selectable provider-effective control for every runnable node family', () => {
    expect(providerEffectiveRequestControls({
      nodeId: 'image', kind: 'image-generator', quantity: 3, aspectRatio: '4:3', outputFormat: 'webp', imageResolution: '4K', imageProvider: 'google', imageModelId: 'gemini-image', safetyTolerance: 5, enableWebSearch: true, inferenceSteps: 8, guidanceScale: 4.5, acceleration: 'high', seed: 42,
    })).toEqual({ quantity: 3, aspectRatio: '4:3', outputFormat: 'webp', imageResolution: '4K', imageProvider: 'google', imageModelId: 'gemini-image', safetyTolerance: 5, enableWebSearch: true, inferenceSteps: 8, guidanceScale: 4.5, acceleration: 'high', seed: 42 })

    expect(providerEffectiveRequestControls({
      nodeId: 'editor', kind: 'image-editor', outputFormat: 'jpeg', imageResolution: '2K', imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro/edit', safetyTolerance: 3, enableWebSearch: true, guidanceScale: 6, seed: 43,
    })).toEqual({ outputFormat: 'jpeg', imageResolution: '2K', imageProvider: 'fal', imageModelId: 'fal-ai/nano-banana-pro/edit', safetyTolerance: 3, enableWebSearch: true, guidanceScale: 6, seed: 43 })

    expect(providerEffectiveRequestControls({
      nodeId: 'upscale', kind: 'upscaler', scale: 4, creativity: 0.4, resemblance: 0.7, guidanceScale: 5, inferenceSteps: 24, negativePrompt: 'waxy texture', seed: 44,
    })).toEqual({ scale: 4, creativity: 0.4, resemblance: 0.7, inferenceSteps: 24, seed: 44 })

    expect(providerEffectiveRequestControls({
      nodeId: 'video', kind: 'video-generator', quantity: 4, videoEngine: 'wan-controlled', aspectRatio: '16:9', duration: 5, frameRate: 24, motionCadence: 16, generateAudio: false, resolution: '580p', bitrateMode: 'high', videoQuality: 'maximum', videoWriteMode: 'small', negativePrompt: 'text', safetyTolerance: 2, autoFix: true, inferenceSteps: 64, guidanceScale: 1.2, acceleration: 'regular', interpolatorModel: 'rife', numInterpolatedFrames: 3, adjustFpsForInterpolation: false, enablePromptExpansion: true, enableInputSafety: false, enableOutputSafety: false, shift: 6, seed: 45,
    })).toEqual({ quantity: 4, videoEngine: 'wan-controlled', aspectRatio: '16:9', duration: 5, frameRate: 24, motionCadence: 16, generateAudio: false, resolution: '580p', bitrateMode: 'high', videoQuality: 'maximum', videoWriteMode: 'small', negativePrompt: 'text', safetyTolerance: 2, autoFix: true, inferenceSteps: 64, guidanceScale: 1.2, acceleration: 'regular', interpolatorModel: 'rife', numInterpolatedFrames: 3, adjustFpsForInterpolation: false, enablePromptExpansion: true, enableInputSafety: false, enableOutputSafety: false, shift: 6, seed: 45 })

    expect(providerEffectiveRequestControls({
      nodeId: 'voice', kind: 'voiceover', voice: 'Rachel', voiceEngine: 'fish-audio', fishModel: 's2-pro', fishReferenceId: 'voice-ref', fishTemperature: 0.65, fishTopP: 0.75, fishVolume: 2, fishNormalizeLoudness: false, fishNormalize: true, fishChunkLength: 220, fishFormat: 'opus', fishSampleRate: 48000, fishOpusBitrate: 64, fishLatency: 'low', speed: 1.1,
    })).toEqual({ voice: 'Rachel', voiceEngine: 'fish-audio', fishModel: 's2-pro', fishReferenceId: 'voice-ref', fishTemperature: 0.65, fishTopP: 0.75, fishVolume: 2, fishNormalizeLoudness: false, fishNormalize: true, fishChunkLength: 220, fishFormat: 'opus', fishSampleRate: 48000, fishOpusBitrate: 64, fishLatency: 'low', speed: 1.1 })

    expect(providerEffectiveRequestControls({ nodeId: 'sfx', kind: 'sound-effects', duration: 12, loop: true, promptInfluence: 0.7, audioOutputFormat: 'wav_44100' })).toEqual({ duration: 12, loop: true, promptInfluence: 0.7, audioOutputFormat: 'wav_44100' })
    expect(providerEffectiveRequestControls({ nodeId: 'music', kind: 'music-generator', duration: 90, forceInstrumental: true, audioOutputFormat: 'mp3_44100_192' })).toEqual({ duration: 90, forceInstrumental: true, audioOutputFormat: 'mp3_44100_192' })
  })
})
