export type TranslationStyle = 'natural' | 'casual' | 'professional'
export type TranslationLength = 'natural' | 'short' | 'detailed'
export type DisplayMode = 'original' | 'translated' | 'bilingual'
export type AIStyle = 'casual' | 'natural' | 'business'

export interface ConversationProfile {
  conversationId: string
  sourceLanguage?: string
  targetLanguage: string
  provider?: 'deepl' | 'google'
  style: TranslationStyle
  length: TranslationLength
  display: DisplayMode
  ai: AIStyle
}

export interface ProfileTranslationDefaults {
  sourceLanguage?: string
  targetLanguage: string
  provider?: 'deepl' | 'google'
  style: TranslationStyle
  length: TranslationLength
  display: DisplayMode
  ai: AIStyle
}

/** Most-specific settings win: conversation → profile → global. */
export function resolveConversationProfile(
  globalDefaults: ProfileTranslationDefaults,
  profileDefaults: Partial<ProfileTranslationDefaults>,
  conversation: Partial<ConversationProfile>,
  conversationId: string,
): ConversationProfile {
  return {
    conversationId,
    sourceLanguage: conversation.sourceLanguage ?? profileDefaults.sourceLanguage ?? globalDefaults.sourceLanguage,
    targetLanguage: conversation.targetLanguage ?? profileDefaults.targetLanguage ?? globalDefaults.targetLanguage,
    provider: conversation.provider ?? profileDefaults.provider ?? globalDefaults.provider,
    style: conversation.style ?? profileDefaults.style ?? globalDefaults.style,
    length: conversation.length ?? profileDefaults.length ?? globalDefaults.length,
    display: conversation.display ?? profileDefaults.display ?? globalDefaults.display,
    ai: conversation.ai ?? profileDefaults.ai ?? globalDefaults.ai,
  }
}
