import type {
  TranslationProvider,
  TranslationProviderAdapter,
  TranslationRequest,
  TranslationResult,
} from './types'
import { TranslationCache } from './cache'

export class TranslationRouter {
  private readonly adapters = new Map<TranslationProvider, TranslationProviderAdapter>()
  private readonly cache = new TranslationCache()

  register(adapter: TranslationProviderAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  async translate(request: TranslationRequest, preferred: TranslationProvider = 'deepl'): Promise<TranslationResult> {
    const results = await this.translateBatch([request], preferred)
    return results[0]
  }

  /**
   * Translate consecutive messages as one logical batch when the selected
   * provider supports native batching. Cached items never reach the provider.
   */
  async translateBatch(
    requests: TranslationRequest[],
    preferred: TranslationProvider = 'deepl',
  ): Promise<TranslationResult[]> {
    if (requests.length === 0) return []

    const results: Array<TranslationResult | undefined> = new Array(requests.length)
    const misses: Array<{ index: number; request: TranslationRequest; key: string }> = []

    requests.forEach((request, index) => {
      const key = this.cacheKey(request)
      const cached = this.cache.get(key)
      if (cached) {
        results[index] = { text: cached.text, provider: cached.provider, cached: true }
      } else {
        misses.push({ index, request, key })
      }
    })

    if (misses.length === 0) return results as TranslationResult[]

    const providers: TranslationProvider[] = preferred === 'deepl'
      ? ['deepl', 'google']
      : ['google', 'deepl']

    let lastError: unknown
    for (const provider of providers) {
      const adapter = this.adapters.get(provider)
      if (!adapter) continue

      try {
        const translated = adapter.translateBatch
          ? await adapter.translateBatch(misses.map((item) => item.request))
          : await Promise.all(misses.map((item) => adapter.translate(item.request)))

        if (translated.length !== misses.length) {
          throw new Error(`Translation provider returned ${translated.length} results for ${misses.length} requests`)
        }

        translated.forEach((text, position) => {
          const item = misses[position]
          this.cache.set(item.key, { text, provider, createdAt: Date.now() })
          results[item.index] = { text, provider, cached: false }
        })

        return results as TranslationResult[]
      } catch (error) {
        lastError = error
      }
    }

    throw new Error(`No translation provider succeeded: ${String(lastError)}`)
  }

  clearCache(): void {
    this.cache.clear()
  }

  cacheSize(): number {
    return this.cache.size()
  }

  private cacheKey(request: TranslationRequest): string {
    return JSON.stringify({
      text: request.text,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      profileId: request.profileId,
      conversationId: request.conversationId,
    })
  }
}
