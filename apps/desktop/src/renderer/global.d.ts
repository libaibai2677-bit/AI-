type UnifiedProfile = {
  id: string
  name: string
  provider: 'whatsapp' | 'telegram'
  status: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  language: string
  translation: {
    provider: 'deepl' | 'google'
    targetLanguage: string
    tone: 'natural' | 'casual' | 'professional'
    length: 'natural' | 'short' | 'detailed'
    bilingual: boolean
  }
  ai: { enabled: boolean; tone: 'casual' | 'business' | 'neutral' }
  lastConversationId?: string
}

declare global {
  interface Window {
    unifiedChat: {
      getVersion: () => Promise<string>
      listProfiles: () => Promise<UnifiedProfile[]>
      getActiveProfile: () => Promise<string | null>
      setActiveProfile: (profileId: string) => Promise<UnifiedProfile>
      createProfile: (input: { name: string; provider: 'whatsapp' | 'telegram' }) => Promise<UnifiedProfile>
      openProfile: (profileId: string) => Promise<{ profileId: string; partition: string; ready: boolean }>
      updateProfile: (profileId: string, patch: Record<string, unknown>) => Promise<UnifiedProfile>
      onQuickLock: (callback: () => void) => () => void
      onQuickSwitch: (callback: (index: number) => void) => () => void
    }
  }
}

export {}
