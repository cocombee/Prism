import { describe, expect, it } from 'vitest'
import { compactProviderError, providerDisplayName, providerErrorDetail } from './providerErrors'

describe('provider errors', () => {
  it('keeps direct ElevenLabs error identity independent of fal', () => {
    expect(providerDisplayName('elevenlabs')).toBe('ElevenLabs')
    expect(compactProviderError('401 unauthorized', 'elevenlabs')).toBe('ElevenLabs rejected this API key. Reconnect it in Connections.')
  })
  it('names BytePlus failures as the direct Seedance provider', () => {
    expect(providerDisplayName('byteplus')).toBe('BytePlus Seedance')
    expect(compactProviderError('401 unauthorized', 'byteplus')).toBe('BytePlus Seedance rejected this API key. Reconnect it in Connections.')
  })
  it('reports explicit Seedance real-face privacy rejection without suggesting unchanged retry', () => {
    expect(compactProviderError('Seedance privacy policy rejected real-face biometric identity reference.', 'fal')).toBe('fal.ai · Seedance 2.5 rejected this real-face reference before generation. An unchanged retry will not help; use a permitted reference or another documented route.')
  })
  it('does not misstate a fal model-route billing failure as a verified zero account balance', () => {
    expect(compactProviderError('Billing hard limit has been reached.', 'fal')).toBe('fal.ai: The selected model route returned a billing-limit error. Check the live account shown in Connections or choose another model route.')
  })

  it('extracts fal validation fields without leaking the request payload', () => {
    const error = Object.assign(new Error('Unprocessable Entity'), {
      body: { detail: [{ loc: ['body', 'image_urls', 4], msg: 'Image could not be downloaded', type: 'value_error' }] },
      requestPayload: { apiKey: 'must-not-appear' },
    })
    expect(providerErrorDetail(error)).toBe('4: Image could not be downloaded')
    expect(providerErrorDetail(error)).not.toContain('must-not-appear')
  })

  it('attributes remote generation failures to the selected node provider', () => {
    const raw = "Error invoking remote method 'generation:run': ValidationError: Unprocessable Entity"
    expect(compactProviderError(raw, 'fal')).toBe("fal.ai rejected this request as invalid. Open Connections for the provider's exact details.")
    expect(compactProviderError(raw, 'fal')).not.toContain('OpenAI')
  })

  it('does not mislabel a local Character-library failure as a provider failure', () => {
    expect(compactProviderError('Character library: a saved view is missing.', 'fal')).toBe('Character library: a saved view is missing.')
  })

  it('turns packaged Electron fetch failures into actionable provider diagnostics', () => {
    const dnsFailure = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('getaddrinfo ENOTFOUND queue.fal.run'), { code: 'ENOTFOUND' }),
    })
    expect(providerErrorDetail(dnsFailure)).toBe('Could not reach the provider because DNS lookup failed. Check the internet connection, VPN, proxy, or DNS, then retry.')
    expect(compactProviderError('TypeError: fetch failed', 'fal')).toBe('fal.ai: Could not reach the provider. Check the internet connection, VPN, or proxy, then retry.')
  })

  it('classifies Electron DNS failures at the main-to-renderer boundary without leaking Chromium network codes', () => {
    const mainMessage = providerErrorDetail(new Error('net::ERR_NAME_NOT_RESOLVED'))
    expect(mainMessage).toBe('DNS lookup for the provider failed. Your prompt and settings are preserved; check the internet connection, VPN, proxy, or DNS, then press Rerun.')
    expect(compactProviderError(`Error invoking remote method 'generation:run': Error: ${mainMessage}`, 'fal')).toBe('fal.ai: DNS lookup failed. Your prompt and settings are preserved; check the internet connection, VPN, proxy, or DNS, then press Rerun.')
  })

  it('does not reinterpret an explicit abort as a network failure', () => {
    const abort = Object.assign(new DOMException('This operation was aborted', 'AbortError'), {
      cause: Object.assign(new Error('socket closed'), { code: 'ECONNRESET' }),
    })
    expect(providerErrorDetail(abort)).toBe('This operation was aborted')
  })
})
