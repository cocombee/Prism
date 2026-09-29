import { shutterDenominator } from './shutter'
import type { GenerationRequest } from './types'
import type { VideoModelDefinition } from './videoModels'
import { effectiveOutputFrameRate } from './videoModels'

export interface ProviderMotionControlDiagnostic {
  code: 'filmic-motion-provider-support'
  severity: 'info'
  blocking: false
  status: 'semantic-prompt-only' | 'native-partial'
  captureCadence: 'native-verified' | 'native-unverified'
  playbackCadence: 'not-separately-supported'
  shutter: 'native-verified' | 'native-unverified'
  message: string
}

export function providerMotionControlDiagnostic(model: VideoModelDefinition): ProviderMotionControlDiagnostic {
  const captureCadence = model.frameRates.length || model.fixedFrameRate ? 'native-verified' : 'native-unverified'
  const shutter = model.nativeShutter ? 'native-verified' : 'native-unverified'
  const unsupported = [captureCadence === 'native-unverified' ? 'capture cadence' : '', shutter === 'native-unverified' ? 'shutter fields' : ''].filter(Boolean).join(' and ')
  return {
    code: 'filmic-motion-provider-support',
    severity: 'info',
    blocking: false,
    status: shutter === 'native-verified' ? 'native-partial' : 'semantic-prompt-only',
    captureCadence,
    playbackCadence: 'not-separately-supported',
    shutter,
    message: `Native ${unsupported} ${unsupported.includes(' and ') ? 'are' : 'is'} unverified for ${model.shortLabel}; filmic motion is semantic prompt intent only. Playback cadence is not a separate provider control.`,
  }
}

export function providerNativeShutterFields(model: VideoModelDefinition, request: Pick<GenerationRequest, 'motionCadence' | 'frameRate' | 'shutterAngle'>): Record<string, number> {
  if (!model.nativeShutter) return {}
  const angle = typeof request.shutterAngle === 'number' ? request.shutterAngle : 180
  if (model.nativeShutter.representation === 'degrees') return { [model.nativeShutter.field]: angle }
  const fps = effectiveOutputFrameRate(model, request.frameRate)
  return { [model.nativeShutter.field]: shutterDenominator(angle, fps) }
}
