import { contextBridge, ipcRenderer } from 'electron'

type ProfileInput = {
  name: string
  provider: 'WhatsApp' | 'Telegram'
  translation: 'DeepL' | 'Google'
  language: string
}

type ProviderSnapshot = {
  profileId: string
  platform: 'whatsapp' | 'telegram'
  conversations: unknown[]
  messages: unknown[]
  syncedAt: string
}

type ProfileHealthStatus = 'connected' | 'attention' | 'disconnected' | 'not-configured'
type ProfileHealthComponent = 'session' | 'network' | 'messages' | 'translation'

type DictionaryEntry = {
  source: string
  target: string
  note?: string
}

type TranslationProvider = 'DeepL' | 'Google'
type TranslationRequest = {
  text: string
  targetLanguage: string
  sourceLanguage?: string
  profileId: string
  conversationId?: string
  style?: 'natural' | 'casual' | 'professional'
  length?: 'natural' | 'short' | 'detailed'
}

type TranslationResult = {
  text: string
  provider: 'deepl' | 'google'
  cached: boolean
}

contextBridge.exposeInMainWorld('unifiedChat', {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getActiveProfileId: () => ipcRenderer.invoke('profiles:active') as Promise<string | null>,
  setActiveProfile: (profileId: string) => ipcRenderer.invoke('profiles:set-active', profileId) as Promise<string>,
  createProfile: (input: ProfileInput) => ipcRenderer.invoke('profiles:create', input),
  setLastConversation: (profileId: string, conversationId: string) => ipcRenderer.invoke('profiles:set-last-conversation', profileId, conversationId),
  setProfileHealth: (profileId: string, component: ProfileHealthComponent, status: ProfileHealthStatus) => ipcRenderer.invoke('profiles:set-health', profileId, component, status),
  openProfile: (profileId: string) => ipcRenderer.invoke('profiles:open', profileId),
  backupProfile: (profileId: string) => ipcRenderer.invoke('profiles:backup', profileId) as Promise<{ canceled: boolean; filePath?: string }>,
  restoreProfile: () => ipcRenderer.invoke('profiles:restore'),
  setProviderSecret: (profileId: string, provider: TranslationProvider, value: string) => ipcRenderer.invoke('provider-secret:set', profileId, provider, value) as Promise<void>,
  hasProviderSecret: (profileId: string, provider: TranslationProvider) => ipcRenderer.invoke('provider-secret:has', profileId, provider) as Promise<boolean>,
  removeProviderSecret: (profileId: string, provider: TranslationProvider) => ipcRenderer.invoke('provider-secret:remove', profileId, provider) as Promise<void>,
  loadMessagesForProfile: (profileId: string) => ipcRenderer.invoke('messages:load-profile', profileId),
  loadUnifiedMessages: () => ipcRenderer.invoke('messages:load-unified'),
  loadUnifiedInbox: () => ipcRenderer.invoke('messages:load-inbox'),
  applyProviderSnapshot: (snapshot: ProviderSnapshot) => ipcRenderer.invoke('messages:apply-snapshot', snapshot),
  clearProfileMessages: (profileId: string) => ipcRenderer.invoke('messages:clear-profile', profileId),
  listTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:list', profileId),
  setTranslationMemoryEntry: (profileId: string, entry: DictionaryEntry) => ipcRenderer.invoke('translation-memory:set', profileId, entry),
  removeTranslationMemoryEntry: (profileId: string, source: string) => ipcRenderer.invoke('translation-memory:remove', profileId, source),
  clearTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:clear', profileId),
  translate: (request: TranslationRequest) => ipcRenderer.invoke('translation:translate', request) as Promise<TranslationResult>,
  translateBatch: (requests: TranslationRequest[]) => ipcRenderer.invoke('translation:translate-batch', requests) as Promise<TranslationResult[]>,
  onQuickLock: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('profile:quick-lock', listener)
    return () => ipcRenderer.removeListener('profile:quick-lock', listener)
  },
  onQuickSwitch: (callback: (index: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, index: number) => callback(index)
    ipcRenderer.on('profile:quick-switch', listener)
    return () => ipcRenderer.removeListener('profile:quick-switch', listener)
  },
})
