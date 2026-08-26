export type TranslationProvider = 'deepl' | 'google'

export interface TranslationRequest {
  text: string
  sourceLanguage?: string
  targetLanguage: string
  profileId: string
  conversationId?: string
  context?: string[]
}

export interface TranslationResult {
  text: string
  provider: TranslationProvider
  cached: boolean
}

export interface TranslationProviderAdapter {
  readonly name: TranslationProvider
  translate(request: TranslationRequest): Promise<string>
}
