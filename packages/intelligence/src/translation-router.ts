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
    const key = this.cacheKey(request)
    const cached = await this.cache.get(key)
    if (cached !== undefined) {
      return { text: cached.text, provider: cached.provider, cached: true }
    }

    const fallback: TranslationProviderId = preferred === 'deepl' ? 'google' : 'deepl'
    const order: TranslationProviderId[] = [preferred, fallback]
    let lastError: unknown
    for (const id of order) {
      const provider = this.providers[id]
      if (!provider) continue
      try {
        const text = await provider.translate(request)
        await this.cache.set(key, { text, provider: id })
        return { text, provider: id, cached: false }
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
