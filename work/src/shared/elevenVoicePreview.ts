/** Only provider catalog preview URLs; never voice samples or API credentials. */
export function elevenVoicePreviewUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 8192) return undefined
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/\.$/, '')
    if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443') return undefined
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || /(?:^|\.)(?:localhost|local|internal|invalid)$/.test(host)) return undefined
    return url.href
  } catch { return undefined }
}
