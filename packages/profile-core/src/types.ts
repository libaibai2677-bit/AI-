export type Provider = 'whatsapp' | 'telegram'

export type ProfileStatus =
  | 'connected'
  | 'attention'
  | 'disconnected'
  | 'not-configured'

export interface TranslationSettings {
  provider: 'deepl' | 'google'
  targetLanguage: string
  tone: 'natural' | 'casual' | 'professional'
  length: 'natural' | 'short' | 'detailed'
  bilingual: boolean
}

export interface AiSettings {
  enabled: boolean
  tone: 'casual' | 'business' | 'neutral'
}

export interface Profile {
  id: string
  name: string
  provider: Provider
  status: ProfileStatus
  isolatedDataPath: string
  language: string
  translation: TranslationSettings
  ai: AiSettings
  lastConversationId?: string
  createdAt: string
  updatedAt: string
}

export interface CreateProfileInput {
  name: string
  provider: Provider
  language?: string
  translation?: Partial<TranslationSettings>
  ai?: Partial<AiSettings>
}
