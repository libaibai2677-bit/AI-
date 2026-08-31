import type {
  TranslationProvider,
  TranslationProviderAdapter,
  TranslationRequest,
  TranslationResult,
} from './types'

type CacheEntry = {
  text: string
  provider: TranslationProvider
  createdAt: number
}

export type TranslationBatchItem = TranslationRequest & { id?: string }

export type TranslationBatchResult = TranslationResult & { id?: string }

export type TranslationRouterOptions = {
  cacheTtlMs?: number
  batchWindowMs?: number
}

/**
 * Provider-agnostic translation router.
 *
 * DeepL is the default route and Google is the automatic fallback. Cache keys
 * are scoped to profile + conversation + language pair so one workspace's
 * translation memory never silently leaks into another workspace.
 */
export class TranslationRouter {
  private readonly adapters = new Map<TranslationProvider, TranslationProviderAdapter>()
  private readonly cache = new Map<string, CacheEntry>()
  private readonly cacheTtlMs: number
  private readonly batchWindowMs: number

  constructor(options: TranslationRouterOptions = {}) {
    this.cacheTtlMs = options.cacheTtlMs ?? 24 * 60 * 60 * 1000
    this.batchWindowMs = options.batchWindowMs ?? 180
  }

  register(adapter: TranslationProviderAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  async translate(request: TranslationRequest, preferred: TranslationProvider = 'deepl'): Promise<TranslationResult> {
    const cacheKey = this.createCacheKey(request)
    const cached = this.getCached(cacheKey)
    if (cached) return { text: cached.text, provider: cached.provider, cached: true }

    const providers: TranslationProvider[] = preferred === 'deepl'
      ? ['deepl', 'google']
      : ['google', 'deepl']

    let lastError: unknown
    for (const provider of providers) {
      const adapter = this.adapters.get(provider)
      if (!adapter) continue

      try {
        const text = await adapter.translate(request)
        this.cache.set(cacheKey, { text, provider, createdAt: Date.now() })
        return { text, provider, cached: false }
      } catch (error) {
        lastError = error
      }
    }

    throw new Error(`No translation provider succeeded: ${String(lastError)}`)
  }

  /**
   * Translate consecutive short messages as one provider request. The caller
   * keeps the original ids and can split the returned text back into message
   * bubbles. This prevents one API call per message burst.
   */
  async translateBatch(
    items: TranslationBatchItem[],
    preferred: TranslationProvider = 'deepl',
  ): Promise<TranslationBatchResult[]> {
    if (items.length === 0) return []
    if (items.length === 1) {
      const result = await this.translate(items[0], preferred)
      return [{ ...result, id: items[0].id }]
    }

    const uncached: TranslationBatchItem[] = []
    const results = new Map<string, TranslationBatchResult>()

    for (const item of items) {
      const cached = this.getCached(this.createCacheKey(item))
      if (cached) {
        results.set(item.id ?? String(results.size), {
          text: cached.text,
          provider: cached.provider,
          cached: true,
          id: item.id,
        })
      } else {
        uncached.push(item)
      }
    }

    if (uncached.length > 0) {
      const separator = '\n'
      const combined = uncached.map((item) => item.text).join(separator)
      const first = uncached[0]
      const batchRequest: TranslationRequest = {
        ...first,
        text: combined,
        context: [...(first.context ?? []), ...uncached.slice(1).map((item) => item.text)],
      }
      const translated = await this.translate(batchRequest, preferred)
      const translatedParts = translated.text.split(separator)

      uncached.forEach((item, index) => {
        results.set(item.id ?? String(index), {
          text: translatedParts[index] ?? translated.text,
          provider: translated.provider,
          cached: translated.cached,
          id: item.id,
        })
      })
    }

    return items.map((item, index) => results.get(item.id ?? String(index))!).map((result) => ({
      ...result,
      id: result.id,
    }))
  }

  /** Wait for the configured short-message aggregation window. */
  async waitForBatchWindow(): Promise<void> {
    await new Promise<void>((resolve) => setTimeout(resolve, this.batchWindowMs))
  }

  clearCache(): void {
    this.cache.clear()
  }

  getCacheSize(): number {
    this.pruneExpired()
    return this.cache.size
  }

  private createCacheKey(request: TranslationRequest): string {
    return JSON.stringify({
      text: request.text.trim(),
      sourceLanguage: request.sourceLanguage ?? 'auto',
      targetLanguage: request.targetLanguage,
      profileId: request.profileId,
      conversationId: request.conversationId ?? 'global',
    })
  }

  private getCached(cacheKey: string): CacheEntry | undefined {
    const entry = this.cache.get(cacheKey)
    if (!entry) return undefined
    if (Date.now() - entry.createdAt > this.cacheTtlMs) {
      this.cache.delete(cacheKey)
      return undefined
    }
    return entry
  }

  private pruneExpired(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.createdAt > this.cacheTtlMs) this.cache.delete(key)
    }
  }
}
