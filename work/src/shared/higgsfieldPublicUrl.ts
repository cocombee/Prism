/** Lexical public-HTTPS boundary, not DNS/content/availability attestation. */
export function assertHiggsfieldPublicUrl(value: string): void {
  if (typeof value !== 'string' || value !== value.trim() || value.length > 8192) throw new Error('Higgsfield media needs a public HTTPS URL without surrounding whitespace.')
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Higgsfield media needs an absolute public HTTPS URL.') }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g,'')
  if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.') || host.includes(':') || host.endsWith('.') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) throw new Error('Higgsfield media needs a public HTTPS URL without credentials or a local address.')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a,b] = host.split('.').map(Number)
    if (a===0 || a===10 || a===127 || a>=224 || a===169&&b===254 || a===172&&b>=16&&b<=31 || a===192&&b===168 || a===100&&b>=64&&b<=127 || a===198&&(b===18||b===19)) throw new Error('Higgsfield media cannot use a private or reserved network address.')
  }
}
