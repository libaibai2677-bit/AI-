import type {
  TranslationProvider,
  TranslationProviderAdapter,
  TranslationRequest,
  TranslationResult,
} from './types'

export class TranslationRouter {
  private readonly adapters = new Map<TranslationProvider, TranslationProviderAdapter>()
  private readonly cache = new Map<string, string>()

  register(adapter: TranslationProviderAdapter): void {
    this.adapters.set(adapter.name, adapter)
  }

  async translate(request: TranslationRequest, preferred: TranslationProvider = 'deepl'): Promise<TranslationResult> {
    const cacheKey = JSON.stringify({
      text: request.text,
      sourceLanguage: request.sourceLanguage,
      targetLanguage: request.targetLanguage,
      profileId: request.profileId,
      conversationId: request.conversationId,
    })

    const cached = this.cache.get(cacheKey)
    if (cached) return { text: cached, provider: preferred, cached: true }

    const providers: TranslationProvider[] = preferred === 'deepl'
      ? ['deepl', 'google']
      : ['google', 'deepl']

    let lastError: unknown
    for (const provider of providers) {
      const adapter = this.adapters.get(provider)
      if (!adapter) continue

      try {
        const text = await adapter.translate(request)
        this.cache.set(cacheKey, text)
        return { text, provider, cached: false }
      } catch (error) {
        lastError = error
      }
    }

    throw new Error(`No translation provider succeeded: ${String(lastError)}`)
  }
}
