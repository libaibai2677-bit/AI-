import type { TranslationProvider, TranslationRequest } from './translation-router'

export interface HttpTranslationProviderOptions {
  apiKey: string
  endpoint?: string
}

async function readJson(response: Response): Promise<unknown> {
  const body = await response.text()
  try {
    return JSON.parse(body) as unknown
  } catch {
    return { raw: body }
  }
}

function assertOk(response: Response, payload: unknown, provider: string): void {
  if (response.ok) return
  const detail = typeof payload === 'object' && payload !== null ? JSON.stringify(payload) : String(payload)
  throw new Error(`${provider} translation failed (${response.status}): ${detail}`)
}

export class DeepLTranslationProvider implements TranslationProvider {
  readonly id = 'deepl' as const
  private readonly apiKey: string
  private readonly endpoint: string

  constructor(options: HttpTranslationProviderOptions) {
    this.apiKey = options.apiKey
    this.endpoint = options.endpoint ?? 'https://api-free.deepl.com/v2/translate'
  }

  async translate(request: TranslationRequest): Promise<string> {
    const results = await this.translateBatch([request])
    return results[0]
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return []
    const first = requests[0]
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: requests.map((request) => request.text),
        source_lang: first.sourceLanguage && first.sourceLanguage !== 'auto' ? first.sourceLanguage.toUpperCase() : undefined,
        target_lang: first.targetLanguage.toUpperCase(),
      }),
    })
    const payload = await readJson(response)
    assertOk(response, payload, 'DeepL')

    const translations = (payload as { translations?: Array<{ text?: string }> }).translations
    if (!translations || translations.length !== requests.length) throw new Error('DeepL returned an unexpected batch size')
    const texts = translations.map((item) => item.text ?? '')
    if (texts.some((text) => !text)) throw new Error('DeepL returned an empty translation')
    return texts
  }
}

export class GoogleTranslationProvider implements TranslationProvider {
  readonly id = 'google' as const
  private readonly apiKey: string
  private readonly endpoint: string

  constructor(options: HttpTranslationProviderOptions) {
    this.apiKey = options.apiKey
    this.endpoint = options.endpoint ?? 'https://translation.googleapis.com/language/translate/v2'
  }

  async translate(request: TranslationRequest): Promise<string> {
    const results = await this.translateBatch([request])
    return results[0]
  }

  async translateBatch(requests: TranslationRequest[]): Promise<string[]> {
    if (requests.length === 0) return []
    const first = requests[0]
    const url = new URL(this.endpoint)
    url.searchParams.set('key', this.apiKey)

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: requests.map((request) => request.text),
        target: first.targetLanguage,
        ...(first.sourceLanguage && first.sourceLanguage !== 'auto' ? { source: first.sourceLanguage } : {}),
        format: 'text',
      }),
    })
    const payload = await readJson(response)
    assertOk(response, payload, 'Google')

    const translations = (payload as { data?: { translations?: Array<{ translatedText?: string }> } }).data?.translations
    if (!translations || translations.length !== requests.length) throw new Error('Google returned an unexpected batch size')
    const texts = translations.map((item) => item.translatedText ?? '')
    if (texts.some((text) => !text)) throw new Error('Google returned an empty translation')
    return texts
  }
}

export function createDefaultTranslationProviders(env: Record<string, string | undefined> = process.env) {
  return {
    ...(env.DEEPL_API_KEY ? { deepl: new DeepLTranslationProvider({ apiKey: env.DEEPL_API_KEY }) } : {}),
    ...(env.GOOGLE_TRANSLATE_API_KEY ? { google: new GoogleTranslationProvider({ apiKey: env.GOOGLE_TRANSLATE_API_KEY }) } : {}),
  }
}
