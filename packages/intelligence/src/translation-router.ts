import type { TranslationMemory } from './translation-memory'

export type TranslationProviderId = 'google'

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
  provider: TranslationProviderId | 'memory'
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
    private readonly memory?: TranslationMemory,
  ) {}

  async translate(request: TranslationRequest): Promise<TranslationResult> {
    const results = await this.translateBatch([request])
    return results[0]
  }

  /** Cache and exact Profile Translation Memory hits stay local; misses use Google only. */
  async translateBatch(requests: TranslationRequest[]): Promise<TranslationResult[]> {
    if (requests.length === 0) return []
    const results: Array<TranslationResult | undefined> = new Array(requests.length)
    const misses: Array<{ index: number; request: TranslationRequest; key: string }> = []

    for (let index = 0; index < requests.length; index += 1) {
      const request = requests[index]
      if (this.memory) {
        const entry = this.memory.get(request.profileId, request.text)
        if (entry) {
          results[index] = { text: entry.target, provider: 'memory', cached: true }
          continue
        }
      }
      const key = this.cacheKey(request)
      const cached = await this.cache.get(key)
      if (cached !== undefined) {
        results[index] = { text: cached.text, provider: cached.provider, cached: true }
      } else {
        misses.push({ index, request, key })
      }
    }

    if (misses.length === 0) return results as TranslationResult[]
    const provider = this.providers.google
    if (!provider) throw new Error('Google translation provider is not configured')
    const texts = provider.translateBatch
      ? await provider.translateBatch(misses.map(item => item.request))
      : await Promise.all(misses.map(item => provider.translate(item.request)))
    if (texts.length !== misses.length) throw new Error(`google returned ${texts.length} results for ${misses.length} requests`)

    for (let position = 0; position < misses.length; position += 1) {
      const item = misses[position]
      const text = texts[position]
      await this.cache.set(item.key, { text, provider: 'google' })
      results[item.index] = { text, provider: 'google', cached: false }
    }
    return results as TranslationResult[]
  }

  private cacheKey(request: TranslationRequest): string {
    return JSON.stringify([request.profileId, request.conversationId ?? '', request.sourceLanguage ?? 'auto', request.targetLanguage, request.style ?? 'natural', request.length ?? 'natural', request.text])
  }
}
