import type { GenerationRequest } from '../shared/types'

type Reference = NonNullable<GenerationRequest['references']>[number]
export interface DirectImageInput { reference: Reference; path?: string; url?: string; mimeType?: string; bytes?: Uint8Array }
const MAX_LOCAL_IMAGE = 50 * 1024 * 1024
const MAX_LOCAL_TOTAL = 100 * 1024 * 1024
const MAX_DATA_URL = 20 * 1024 * 1024 // OpenAI's declared image_url string bound; conservative shared inline bound.

/** Pass a public URI to the provider; never fetch arbitrary media in Electron. */
export function assertDirectImageUrl(value: string): void {
  if (value.length > 8192 || value !== value.trim()) throw new Error('Use an absolute public HTTPS image URL without surrounding whitespace.')
  let url: URL
  try { url = new URL(value) } catch { throw new Error('Use an absolute public HTTPS image URL.') }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (url.protocol !== 'https:' || url.username || url.password || !host || !host.includes('.') || host.includes(':') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host) || host.endsWith('.')) throw new Error('Use an absolute public HTTPS image URL without credentials or a local address.')
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const [a, b] = host.split('.').map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) throw new Error('Use a public image URL, not a private or reserved network address.')
  }
}
function inlineImage(value: string): { mimeType: string; bytes: Uint8Array } {
  if (value.length > MAX_DATA_URL) throw new Error('The inline image exceeds the native image URL limit; import a smaller image.')
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) throw new Error('Use a complete PNG, JPEG or WebP base64 image data URL.')
  const bytes = Buffer.from(match[2], 'base64')
  if (!bytes.length || bytes.toString('base64') !== match[2]) throw new Error('The image data URL is malformed.')
  return { mimeType: match[1], bytes }
}
export async function prepareDirectImageInputs(references: Reference[], maximum: number, dependencies: {
  managed: (path: string) => Promise<string>; size: (path: string) => Promise<number>; read: (path: string) => Promise<Uint8Array>; mime: (path: string) => string; assertCurrent: () => void
}): Promise<DirectImageInput[]> {
  const selected = references.filter(reference => !(reference.role === 'style' && reference.path && /\.prismstyle$/i.test(reference.path)))
  if (selected.length > maximum) throw new Error(`The selected image model accepts up to ${maximum} image references.`)
  // Validate every remote/type entry before reading any managed bytes.
  for (const reference of selected) {
    if (reference.mediaType && reference.mediaType !== 'image') throw new Error('Direct image generation accepts image references only.')
    if (!reference.path && !reference.url) throw new Error('Relink the missing image reference before generating.')
    if (!reference.path && reference.url && !reference.url.startsWith('data:')) assertDirectImageUrl(reference.url)
    if (!reference.path && reference.url?.startsWith('data:')) inlineImage(reference.url)
  }
  const inputs: DirectImageInput[] = []; let total = 0
  for (const reference of selected) {
    dependencies.assertCurrent()
    if (reference.path) {
      const path = await dependencies.managed(reference.path)
      dependencies.assertCurrent()
      const mimeType = dependencies.mime(path)
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) throw new Error('Direct image references must be PNG, JPEG or WebP images.')
      const size = await dependencies.size(path)
      if (!Number.isSafeInteger(size) || size < 1 || size > MAX_LOCAL_IMAGE || total + size > MAX_LOCAL_TOTAL) throw new Error('Managed image references exceed Prism’s bounded native input size.')
      const bytes = await dependencies.read(path)
      dependencies.assertCurrent()
      if (bytes.byteLength !== size) throw new Error('The image changed while preparing the request. Try again after saving it.')
      total += bytes.byteLength; inputs.push({ reference, path, mimeType, bytes })
    } else if (reference.url!.startsWith('data:')) {
      const { mimeType, bytes } = inlineImage(reference.url!)
      total += bytes.byteLength
      if (total > MAX_LOCAL_TOTAL) throw new Error('Image references exceed Prism’s bounded native input size.')
      inputs.push({ reference, url: reference.url, mimeType, bytes })
    } else inputs.push({ reference, url: reference.url })
  }
  return inputs
}
