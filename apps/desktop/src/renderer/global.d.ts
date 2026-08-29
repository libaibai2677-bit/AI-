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

declare global {
  interface Window {
    unifiedChat?: {
      getVersion: () => Promise<string>
      listProfiles: () => Promise<UnifiedChatProfile[]>
      createProfile: (input: UnifiedChatProfileInput) => Promise<UnifiedChatProfile>
      openProfile: (profileId: string) => Promise<UnifiedChatProfile>
      backupProfile: (profileId: string) => Promise<{ canceled: boolean; filePath?: string }>
      onQuickLock: (callback: () => void) => () => void
      onQuickSwitch: (callback: (index: number) => void) => () => void
    }
  }
}

export {}
