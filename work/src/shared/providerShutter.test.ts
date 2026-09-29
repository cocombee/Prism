import { describe, expect, it } from 'vitest'
import type { GenerationRequest } from './types'
import type { VideoModelDefinition } from './videoModels'
import { providerMotionControlDiagnostic, providerNativeShutterFields } from './providerShutter'
import { resolveVideoModel } from './videoModels'

const request: GenerationRequest = { nodeId: 'video', kind: 'video-generator', frameRate: 24, motionCadence: 16, shutterMode: 'speed', shutterAngle: 180 }

describe('typed provider-native shutter capability', () => {
  it('omits undocumented native fields for every current provider model', () => {
    for (const id of ['bytedance/seedance-2.5/text-to-video', 'byteplus/seedance-2.5/text-to-video', 'fal-ai/kling-video/v3/standard/text-to-video', 'fal-ai/veo3.1', 'wan-controlled']) {
      expect(providerNativeShutterFields(resolveVideoModel(id), request), id).toEqual({})
    }
  })

  it('serializes only the exact verified representation while canonical angle remains stable', () => {
    const base = resolveVideoModel('wan-controlled')
    const angleModel: VideoModelDefinition = { ...base, nativeShutter: { field: 'shutter_angle', representation: 'degrees' } }
    expect(providerNativeShutterFields(angleModel, request)).toEqual({ shutter_angle: 180 })
    const speedModel: VideoModelDefinition = { ...base, nativeShutter: { field: 'shutter_speed', representation: 'reciprocal-denominator' } }
    expect(providerNativeShutterFields(speedModel, request)).toEqual({ shutter_speed: 48 })
    expect(request.shutterAngle).toBe(180)
  })

  it('reports truthful non-blocking semantic fallback for current unverified native shutter support', () => {
    const seedance = providerMotionControlDiagnostic(resolveVideoModel('bytedance/seedance-2.5/text-to-video'))
    expect(seedance).toEqual({
      code: 'filmic-motion-provider-support',
      severity: 'info',
      blocking: false,
      status: 'semantic-prompt-only',
      captureCadence: 'native-unverified',
      playbackCadence: 'not-separately-supported',
      shutter: 'native-unverified',
      message: 'Native capture cadence and shutter fields are unverified for Seedance 2.5; filmic motion is semantic prompt intent only. Playback cadence is not a separate provider control.',
    })
    const wan = providerMotionControlDiagnostic(resolveVideoModel('wan-controlled'))
    expect(wan).toMatchObject({ blocking: false, status: 'semantic-prompt-only', captureCadence: 'native-verified', shutter: 'native-unverified' })
    expect(providerNativeShutterFields(resolveVideoModel('bytedance/seedance-2.5/text-to-video'), request)).toEqual({})
  })
})
