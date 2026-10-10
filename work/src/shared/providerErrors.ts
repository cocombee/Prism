import type { ServiceProvider } from './types'

type ProviderFieldError = { loc?: Array<string | number>; msg?: string }

type ErrorCause = { cause?: unknown; code?: unknown; message?: unknown; name?: unknown }

function transportFailureDetail(error: unknown): string | undefined {
  const seen = new Set<unknown>()
  let current: unknown = error
  let fetchFailed = false
  let chromiumDnsFailure = false
  const codes = new Set<string>()
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current)
    const candidate = current as ErrorCause
    if (typeof candidate.message === 'string' && /fetch failed|network request failed/i.test(candidate.message)) fetchFailed = true
    if (typeof candidate.message === 'string' && /(?:net::)?ERR_NAME_NOT_RESOLVED/i.test(candidate.message)) chromiumDnsFailure = true
    if (typeof candidate.code === 'string') codes.add(candidate.code.toUpperCase())
    if (candidate.name === 'AbortError') return undefined
    current = candidate.cause
  }
  if (!fetchFailed && !chromiumDnsFailure && !codes.size) return undefined
  if (chromiumDnsFailure) return 'DNS lookup for the provider failed. Your prompt and settings are preserved; check the internet connection, VPN, proxy, or DNS, then press Rerun.'
  if ([...codes].some((code) => ['ENOTFOUND', 'EAI_AGAIN'].includes(code))) return 'Could not reach the provider because DNS lookup failed. Check the internet connection, VPN, proxy, or DNS, then retry.'
  if ([...codes].some((code) => ['ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT'].includes(code))) return 'The provider did not respond before the network timeout. Check the internet connection, VPN, or proxy, then retry.'
  if ([...codes].some((code) => ['ECONNRESET', 'EPIPE', 'UND_ERR_SOCKET'].includes(code))) return 'The connection to the provider was interrupted. Check the internet connection, VPN, or proxy, then retry.'
  if ([...codes].some((code) => ['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code))) return 'The provider network could not be reached. Check the internet connection, VPN, or proxy, then retry.'
  return fetchFailed ? 'Could not reach the provider. Check the internet connection, VPN, or proxy, then retry.' : undefined
}

export function providerErrorDetail(error: unknown, fallback = 'Generation failed.'): string {
  const candidate = error as { message?: unknown; body?: { detail?: unknown } } | null
  const detail = candidate?.body?.detail
  if (typeof detail === 'string' && detail.trim()) return detail.trim()
  if (Array.isArray(detail)) {
    const fields = detail.flatMap((item): string[] => {
      const fieldError = item as ProviderFieldError
      if (!fieldError?.msg?.trim()) return []
      const field = fieldError.loc?.filter((part) => part !== 'body').at(-1)
      return [`${field === undefined ? '' : `${String(field)}: `}${fieldError.msg.trim()}`]
    })
    if (fields.length) return fields.join('; ')
  }
  const transportDetail = transportFailureDetail(error)
  if (transportDetail) return transportDetail
  return error instanceof Error && error.message.trim() ? error.message.trim() : fallback
}

export function providerDisplayName(provider: ServiceProvider): string {
  if (provider === 'elevenlabs') return 'ElevenLabs'
  return provider === 'fal' ? 'fal.ai'
    : provider === 'byteplus' ? 'BytePlus Seedance'
      : provider === 'omniroute' ? 'OmniRoute'
      : provider === 'openai' ? 'OpenAI'
      : provider === 'google' ? 'Google Gemini'
        : provider === 'anthropic' ? 'Anthropic Claude'
          : provider === 'deepseek' ? 'DeepSeek'
            : provider === 'moonshot' ? 'Kimi' : 'Fish Audio'
}

export function compactProviderError(rawError: string | undefined, provider: ServiceProvider): string | undefined {
  if (!rawError) return undefined
  const name = providerDisplayName(provider)
  const cleaned = rawError
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^(?:ValidationError|ApiError|Error):\s*/i, '')
    .trim()
  if (/^Character library:\s*/i.test(cleaned)) return cleaned
  if (cleaned.toLowerCase().startsWith(`${name.toLowerCase()}:`)) return cleaned
  const retry = cleaned.match(/retry in\s+([\d.]+)s/i)?.[1]
  if (/seedance|real[- ]?face|privacy|biometric/i.test(cleaned) && /real[- ]?face|privacy|biometric|identity protection/i.test(cleaned)) return 'fal.ai · Seedance 2.5 rejected this real-face reference before generation. An unchanged retry will not help; use a permitted reference or another documented route.'
  if (/billing hard limit has been reached/i.test(cleaned)) return `${name}: The selected model route returned a billing-limit error. Check the live account shown in Connections or choose another model route.`
  if (/quota exceeded|exceeded your current quota|rate.?limit/i.test(cleaned)) return `${name} quota reached${retry ? ` · retry in ${Math.ceil(Number(retry))}s` : ''}. Try another service or check billing.`
  if (/not permitted|permission|forbidden|403/i.test(cleaned)) return `${name} cannot access this model. Choose another model or check the API key.`
  if (/unauthorized|invalid.+key|401/i.test(cleaned)) return `${name} rejected this API key. Reconnect it in Connections.`
  if (/^DNS lookup for the provider failed\./i.test(cleaned) || /(?:net::)?ERR_NAME_NOT_RESOLVED/i.test(cleaned)) return `${name}: DNS lookup failed. Your prompt and settings are preserved; check the internet connection, VPN, proxy, or DNS, then press Rerun.`
  if (/^typeerror:\s*fetch failed$/i.test(cleaned) || /^fetch failed$/i.test(cleaned)) return `${name}: Could not reach the provider. Check the internet connection, VPN, or proxy, then retry.`
  if (/^unprocessable entity$/i.test(cleaned)) return `${name} rejected this request as invalid. Open Connections for the provider's exact details.`
  return `${name}: ${cleaned || 'Request failed.'}`
}
