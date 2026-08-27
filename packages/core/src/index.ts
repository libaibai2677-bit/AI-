export type Provider = 'WhatsApp' | 'Telegram'

export type ProfileStatus = 'connected' | 'attention' | 'disconnected' | 'not-configured'

export type TranslationProvider = 'DeepL' | 'Google'

export type TranslationTone = 'natural' | 'casual' | 'professional'
export type TranslationLength = 'natural' | 'short' | 'detailed'

export interface TranslationStyle {
  tone: TranslationTone
  length: TranslationLength
  avoid: string[]
}

export interface DictionaryEntry {
  source: string
  target: string
}

export interface Profile {
  id: string
  name: string
  provider: Provider
  status: ProfileStatus
  translation: TranslationProvider
  language: string
  lastConversationId?: string
  translationStyle?: TranslationStyle
  dictionary: DictionaryEntry[]
}

export interface ConversationSettings {
  languageFrom: string
  languageTo: string
  translation: TranslationProvider
  style: TranslationStyle
  display: 'original' | 'bilingual' | 'translated'
  aiTone: 'casual' | 'business' | 'neutral'
}

export interface Message {
  id: string
  profileId: string
  conversationId: string
  sender: string
  body: string
  translatedBody?: string
  timestamp: number
}

export interface TranslationRequest {
  text: string
  sourceLanguage?: string
  targetLanguage: string
  provider: TranslationProvider
  style?: TranslationStyle
  dictionary?: DictionaryEntry[]
}

export interface TranslationResult {
  text: string
  provider: TranslationProvider
  cached: boolean
}

export const DEFAULT_TRANSLATION_STYLE: TranslationStyle = {
  tone: 'natural',
  length: 'natural',
  avoid: ['too formal', 'literal translation', 'excessive punctuation'],
}
