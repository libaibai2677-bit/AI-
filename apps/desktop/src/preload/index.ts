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

type DictionaryEntry = {
  source: string
  target: string
  note?: string
}

contextBridge.exposeInMainWorld('unifiedChat', {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getActiveProfileId: () => ipcRenderer.invoke('profiles:active') as Promise<string | null>,
  setActiveProfile: (profileId: string) => ipcRenderer.invoke('profiles:set-active', profileId) as Promise<string>,
  createProfile: (input: ProfileInput) => ipcRenderer.invoke('profiles:create', input),
  setLastConversation: (profileId: string, conversationId: string) => ipcRenderer.invoke('profiles:set-last-conversation', profileId, conversationId),
  openProfile: (profileId: string) => ipcRenderer.invoke('profiles:open', profileId),
  backupProfile: (profileId: string) => ipcRenderer.invoke('profiles:backup', profileId) as Promise<{ canceled: boolean; filePath?: string }>,
  restoreProfile: () => ipcRenderer.invoke('profiles:restore'),
  loadMessagesForProfile: (profileId: string) => ipcRenderer.invoke('messages:load-profile', profileId),
  loadUnifiedMessages: () => ipcRenderer.invoke('messages:load-unified'),
  loadUnifiedInbox: () => ipcRenderer.invoke('messages:load-inbox'),
  applyProviderSnapshot: (snapshot: ProviderSnapshot) => ipcRenderer.invoke('messages:apply-snapshot', snapshot),
  clearProfileMessages: (profileId: string) => ipcRenderer.invoke('messages:clear-profile', profileId),
  listTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:list', profileId),
  setTranslationMemoryEntry: (profileId: string, entry: DictionaryEntry) => ipcRenderer.invoke('translation-memory:set', profileId, entry),
  removeTranslationMemoryEntry: (profileId: string, source: string) => ipcRenderer.invoke('translation-memory:remove', profileId, source),
  clearTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:clear', profileId),
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
