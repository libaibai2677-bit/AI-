export type TranslationProviderId = 'deepl' | 'google'

export interface TranslationRequest {
  text: string
  sourceLanguage?: string
  targetLanguage: string
  profileId: string
  conversationId?: string
  style?: 'natural' | 'casual' | 'professional'
  length?: 'natural' | 'short' | 'detailed'
}

export interface TranslationResult {
  text: string
  provider: TranslationProviderId
  cached: boolean
}

export interface TranslationProvider {
  readonly id: TranslationProviderId
  translate(request: TranslationRequest): Promise<string>
  translateBatch?(requests: TranslationRequest[]): Promise<string[]>
}

export interface TranslationCacheEntry {
  text: string
  provider: TranslationProviderId
}

export interface TranslationCache {
  get(key: string): Promise<TranslationCacheEntry | undefined>
  set(key: string, value: TranslationCacheEntry): Promise<void>
}

export class MemoryTranslationCache implements TranslationCache {
  private readonly values = new Map<string, TranslationCacheEntry>()
  async get(key: string) { return this.values.get(key) }
  async set(key: string, value: TranslationCacheEntry) { this.values.set(key, value) }
}

export class TranslationRouter {
  constructor(
    private readonly providers: Partial<Record<TranslationProviderId, TranslationProvider>>,
    private readonly cache: TranslationCache = new MemoryTranslationCache(),
  ) {}

  async translate(request: TranslationRequest, preferred: TranslationProviderId = 'deepl'): Promise<TranslationResult> {
    const results = await this.translateBatch([request], preferred)
    return results[0]
  }

  /** Cache hits stay local; misses are submitted as one provider-native batch. */
  async translateBatch(requests: TranslationRequest[], preferred: TranslationProviderId = 'deepl'): Promise<TranslationResult[]> {
    if (requests.length === 0) return []

    const results: Array<TranslationResult | undefined> = new Array(requests.length)
    const misses: Array<{ index: number; request: TranslationRequest; key: string }> = []

    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index]
      const key = this.cacheKey(request)
      const cached = await this.cache.get(key)
      if (cached !== undefined) {
        results[index] = { text: cached.text, provider: cached.provider, cached: true }
      } else {
        misses.push({ index, request, key })
      }
    }

    if (misses.length === 0) return results as TranslationResult[]

    const fallback: TranslationProviderId = preferred === 'deepl' ? 'google' : 'deepl'
    const order: TranslationProviderId[] = [preferred, fallback]
    let lastError: unknown

    for (const id of order) {
      const provider = this.providers[id]
      if (!provider) continue
      try {
        const texts = provider.translateBatch
          ? await provider.translateBatch(misses.map((item) => item.request))
          : await Promise.all(misses.map((item) => provider.translate(item.request)))

        if (texts.length !== misses.length) {
          throw new Error(`${id} returned ${texts.length} results for ${misses.length} requests`)
        }

        for (let position = 0; position < misses.length; position += 1) {
          const item = misses[position]
          const text = texts[position]
          await this.cache.set(item.key, { text, provider: id })
          results[item.index] = { text, provider: id, cached: false }
        }
        return results as TranslationResult[]
      } catch (error) {
        lastError = error
      }
    }

    throw new Error(`No translation provider succeeded: ${String(lastError ?? 'not configured')}`)
  }

  private cacheKey(request: TranslationRequest): string {
    return JSON.stringify([
      request.profileId,
      request.conversationId ?? '',
      request.sourceLanguage ?? 'auto',
      request.targetLanguage,
      request.style ?? 'natural',
      request.length ?? 'natural',
      request.text,
    ])
  }
}
