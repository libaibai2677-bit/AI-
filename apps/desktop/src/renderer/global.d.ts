type UnifiedChatProfile = {
  id: string
  name: string
  provider: 'WhatsApp' | 'Telegram'
  status: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  translation: 'DeepL' | 'Google'
  language: string
  lastConversationId?: string
}

type UnifiedChatProfileInput = Pick<UnifiedChatProfile, 'name' | 'provider' | 'translation' | 'language'>
type UnifiedChatTranslationProvider = 'DeepL' | 'Google'

type UnifiedChatDictionaryEntry = {
  source: string
  target: string
  note?: string
}

type UnifiedChatMessage = {
  id: string
  profileId: string
  conversationId: string
  platform: 'whatsapp' | 'telegram'
  sender: { id: string; displayName: string }
  text: string
  translatedText?: string
  timestamp: string
  unread: boolean
  mentioned: boolean
  favorite: boolean
  followUp: boolean
}

type UnifiedChatConversation = {
  id: string
  profileId: string
  platform: 'whatsapp' | 'telegram'
  title: string
  participant?: { id: string; displayName: string }
  lastMessage?: UnifiedChatMessage
  unreadCount: number
}

type UnifiedChatIndexedConversation = UnifiedChatConversation & {
  unreadCount: number
  mentionCount: number
  favorite: boolean
  followUp: boolean
  updatedAt: string
}

type UnifiedChatMessageState = {
  version: number
  conversations: UnifiedChatConversation[]
  messages: UnifiedChatMessage[]
  updatedAt: string
}

type UnifiedChatProviderSnapshot = {
  profileId: string
  platform: 'whatsapp' | 'telegram'
  conversations: UnifiedChatConversation[]
  messages: UnifiedChatMessage[]
  syncedAt: string
}

declare global {
  interface Window {
    unifiedChat?: {
      getVersion: () => Promise<string>
      listProfiles: () => Promise<UnifiedChatProfile[]>
      getActiveProfileId: () => Promise<string | null>
      setActiveProfile: (profileId: string) => Promise<string>
      createProfile: (input: UnifiedChatProfileInput) => Promise<UnifiedChatProfile>
      setLastConversation: (profileId: string, conversationId: string) => Promise<UnifiedChatProfile>
      openProfile: (profileId: string) => Promise<UnifiedChatProfile>
      backupProfile: (profileId: string) => Promise<{ canceled: boolean; filePath?: string }>
      restoreProfile: () => Promise<{ canceled: boolean; profile?: UnifiedChatProfile }>
      setProviderSecret: (profileId: string, provider: UnifiedChatTranslationProvider, value: string) => Promise<void>
      getProviderSecret: (profileId: string, provider: UnifiedChatTranslationProvider) => Promise<string | null>
      hasProviderSecret: (profileId: string, provider: UnifiedChatTranslationProvider) => Promise<boolean>
      removeProviderSecret: (profileId: string, provider: UnifiedChatTranslationProvider) => Promise<void>
      loadMessagesForProfile: (profileId: string) => Promise<{ conversations: UnifiedChatConversation[]; messages: UnifiedChatMessage[] }>
      loadUnifiedMessages: () => Promise<UnifiedChatMessageState>
      loadUnifiedInbox: () => Promise<UnifiedChatIndexedConversation[]>
      applyProviderSnapshot: (snapshot: UnifiedChatProviderSnapshot) => Promise<UnifiedChatMessageState>
      clearProfileMessages: (profileId: string) => Promise<void>
      listTranslationMemory: (profileId: string) => Promise<UnifiedChatDictionaryEntry[]>
      setTranslationMemoryEntry: (profileId: string, entry: UnifiedChatDictionaryEntry) => Promise<UnifiedChatDictionaryEntry>
      removeTranslationMemoryEntry: (profileId: string, source: string) => Promise<void>
      clearTranslationMemory: (profileId: string) => Promise<void>
      onQuickLock: (callback: () => void) => () => void
      onQuickSwitch: (callback: (index: number) => void) => () => void
    }
  }
}

export {}
