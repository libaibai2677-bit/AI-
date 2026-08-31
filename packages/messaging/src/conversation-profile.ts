export type TranslationEngine = 'DeepL' | 'Google'
export type TranslationTone = 'Natural' | 'Casual' | 'Professional'
export type TranslationLength = 'Natural' | 'Short' | 'Detailed'
export type DisplayMode = 'Original' | 'Bilingual' | 'Translated'
export type AiTone = 'Casual' | 'Business'

/**
 * Conversation-level overrides. Every field is optional so the resolver can
 * inherit from the Profile and finally the global defaults.
 */
export interface ConversationProfile {
  profileId: string
  conversationId: string
  sourceLanguage?: string
  targetLanguage?: string
  translationEngine?: TranslationEngine
  tone?: TranslationTone
  length?: TranslationLength
  display?: DisplayMode
  aiTone?: AiTone
}

export interface TranslationDefaults {
  sourceLanguage: string
  targetLanguage: string
  translationEngine: TranslationEngine
  tone: TranslationTone
  length: TranslationLength
  display: DisplayMode
  aiTone: AiTone
}

export type ConversationProfileOverrides = Omit<TranslationDefaults, 'sourceLanguage' | 'targetLanguage'> & {
  sourceLanguage: string
  targetLanguage: string
}

/** Resolve settings from least-specific to most-specific. */
export function resolveConversationProfile(
  globalDefaults: TranslationDefaults,
  profileDefaults: Partial<TranslationDefaults>,
  conversation: ConversationProfile,
): ConversationProfileOverrides {
  return {
    sourceLanguage: conversation.sourceLanguage ?? profileDefaults.sourceLanguage ?? globalDefaults.sourceLanguage,
    targetLanguage: conversation.targetLanguage ?? profileDefaults.targetLanguage ?? globalDefaults.targetLanguage,
    translationEngine: conversation.translationEngine ?? profileDefaults.translationEngine ?? globalDefaults.translationEngine,
    tone: conversation.tone ?? profileDefaults.tone ?? globalDefaults.tone,
    length: conversation.length ?? profileDefaults.length ?? globalDefaults.length,
    display: conversation.display ?? profileDefaults.display ?? globalDefaults.display,
    aiTone: conversation.aiTone ?? profileDefaults.aiTone ?? globalDefaults.aiTone,
  }
}
