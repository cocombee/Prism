export type VoiceLanguageOption = { value: string; label: string }

/**
 * Eleven v3's complete advertised language catalog. Values are the model's
 * published language identifiers, not inferred two-letter aliases.
 */
export const ELEVEN_V3_LANGUAGES: readonly VoiceLanguageOption[] = [
  { value: 'afr', label: 'Afrikaans' },
  { value: 'ara', label: 'Arabic' },
  { value: 'hye', label: 'Armenian' },
  { value: 'asm', label: 'Assamese' },
  { value: 'aze', label: 'Azerbaijani' },
  { value: 'bel', label: 'Belarusian' },
  { value: 'ben', label: 'Bengali' },
  { value: 'bos', label: 'Bosnian' },
  { value: 'bul', label: 'Bulgarian' },
  { value: 'cat', label: 'Catalan' },
  { value: 'ceb', label: 'Cebuano' },
  { value: 'nya', label: 'Chichewa' },
  { value: 'hrv', label: 'Croatian' },
  { value: 'ces', label: 'Czech' },
  { value: 'dan', label: 'Danish' },
  { value: 'nld', label: 'Dutch' },
  { value: 'eng', label: 'English' },
  { value: 'est', label: 'Estonian' },
  { value: 'fil', label: 'Filipino' },
  { value: 'fin', label: 'Finnish' },
  { value: 'fra', label: 'French' },
  { value: 'glg', label: 'Galician' },
  { value: 'kat', label: 'Georgian' },
  { value: 'deu', label: 'German' },
  { value: 'ell', label: 'Greek' },
  { value: 'guj', label: 'Gujarati' },
  { value: 'hau', label: 'Hausa' },
  { value: 'heb', label: 'Hebrew' },
  { value: 'hin', label: 'Hindi' },
  { value: 'hun', label: 'Hungarian' },
  { value: 'isl', label: 'Icelandic' },
  { value: 'ind', label: 'Indonesian' },
  { value: 'gle', label: 'Irish' },
  { value: 'ita', label: 'Italian' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'jav', label: 'Javanese' },
  { value: 'kan', label: 'Kannada' },
  { value: 'kaz', label: 'Kazakh' },
  { value: 'kir', label: 'Kirghiz' },
  { value: 'kor', label: 'Korean' },
  { value: 'lav', label: 'Latvian' },
  { value: 'lin', label: 'Lingala' },
  { value: 'lit', label: 'Lithuanian' },
  { value: 'ltz', label: 'Luxembourgish' },
  { value: 'mkd', label: 'Macedonian' },
  { value: 'msa', label: 'Malay' },
  { value: 'mal', label: 'Malayalam' },
  { value: 'cmn', label: 'Mandarin Chinese' },
  { value: 'mar', label: 'Marathi' },
  { value: 'nep', label: 'Nepali' },
  { value: 'nor', label: 'Norwegian' },
  { value: 'pus', label: 'Pashto' },
  { value: 'fas', label: 'Persian' },
  { value: 'pol', label: 'Polish' },
  { value: 'por', label: 'Portuguese' },
  { value: 'pan', label: 'Punjabi' },
  { value: 'ron', label: 'Romanian' },
  { value: 'rus', label: 'Russian' },
  { value: 'srp', label: 'Serbian' },
  { value: 'snd', label: 'Sindhi' },
  { value: 'slk', label: 'Slovak' },
  { value: 'slv', label: 'Slovenian' },
  { value: 'som', label: 'Somali' },
  { value: 'spa', label: 'Spanish' },
  { value: 'swa', label: 'Swahili' },
  { value: 'swe', label: 'Swedish' },
  { value: 'tam', label: 'Tamil' },
  { value: 'tel', label: 'Telugu' },
  { value: 'tha', label: 'Thai' },
  { value: 'tur', label: 'Turkish' },
  { value: 'ukr', label: 'Ukrainian' },
  { value: 'urd', label: 'Urdu' },
  { value: 'vie', label: 'Vietnamese' },
  { value: 'cym', label: 'Welsh' },
]

const LEGACY_ELEVEN_LANGUAGE_CODES: Readonly<Record<string, string>> = {
  en: 'eng',
  id: 'ind',
  ja: 'jpn',
  ms: 'msa',
  zh: 'cmn',
}

export function normalizedElevenV3LanguageCode(value?: string): string {
  if (!value) return ''
  return LEGACY_ELEVEN_LANGUAGE_CODES[value] || value
}

/** Representative locale flag; language labels and provider values remain authoritative. */
export function voiceLanguageFlag(language: string): string {
  if (!language) return '🌐'
  try {
    const region = new Intl.Locale(language).maximize().region
    return region && /^[A-Z]{2}$/.test(region) ? [...region].map(letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join('') : '🌐'
  } catch { return '🌐' }
}
