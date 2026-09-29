const UPPERCASE_TOKENS = new Map([
  ['ai', 'AI'], ['api', 'API'], ['deepseek', 'DeepSeek'], ['flux', 'FLUX'], ['fps', 'FPS'], ['gpt', 'GPT'], ['hd', 'HD'],
  ['hdr', 'HDR'], ['jpeg', 'JPEG'], ['llm', 'LLM'], ['lora', 'LoRA'], ['o1', 'O1'], ['o3', 'O3'], ['openai', 'OpenAI'], ['png', 'PNG'], ['realesrgan', 'RealESRGAN'],
  ['s1', 'S1'], ['s2', 'S2'], ['tts', 'TTS'], ['ui', 'UI'], ['ux', 'UX'], ['webp', 'WebP'],
])

function titleToken(token: string): string {
  const lower = token.toLowerCase()
  if (UPPERCASE_TOKENS.has(lower)) return UPPERCASE_TOKENS.get(lower)!
  if (/^\d+k$/i.test(token)) return token.toUpperCase()
  if (/^v\d+(?:\.\d+)?$/i.test(token)) return `V${token.slice(1)}`
  if (/^\d+(?:\.\d+)?$/.test(token) || /^\d{4}-\d{2}-\d{2}$/.test(token)) return token
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Display-only normalization. Provider model IDs always remain untouched. */
export function modelDisplayName(id: string, suppliedLabel?: string): string {
  const source = (suppliedLabel || id).trim()
  if (!source) return id
  return source
    .replace(/-(\d{4})-(\d{2})-(\d{2})\b/g, ' · $1~$2~$3')
    .replace(/[_/]+/g, ' ')
    .replace(/-/g, ' ')
    .split(/(\s+|·)/)
    .map((part) => /^\s+$/.test(part) || part === '·' ? part : titleToken(part))
    .join('')
    .replace(/~/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}
