import { contextBridge, ipcRenderer } from 'electron'

type ProfileInput = { name: string; provider: 'WhatsApp' | 'Telegram'; translation: 'DeepL' | 'Google'; language: string }
type ProviderSnapshot = { profileId: string; platform: 'whatsapp' | 'telegram'; conversations: unknown[]; messages: unknown[]; syncedAt: string }
type ProfileHealthStatus = 'connected' | 'attention' | 'disconnected' | 'not-configured'
type ProfileHealthComponent = 'session' | 'network' | 'messages' | 'translation'
type DictionaryEntry = { source: string; target: string; note?: string }
type TranslationProvider = 'DeepL' | 'Google'
type TranslationRequest = { text: string; targetLanguage: string; sourceLanguage?: string; profileId: string; conversationId?: string; style?: 'natural' | 'casual' | 'professional'; length?: 'natural' | 'short' | 'detailed' }
type TranslationResult = { text: string; provider: 'deepl' | 'google'; cached: boolean }
type ConversationProfile = { profileId: string; conversationId: string; sourceLanguage?: string; targetLanguage?: string; translationEngine?: 'DeepL' | 'Google'; tone?: 'Natural' | 'Casual' | 'Professional'; length?: 'Natural' | 'Short' | 'Detailed'; display?: 'Original' | 'Bilingual' | 'Translated'; aiTone?: 'Casual' | 'Business' }
type TranslationSearchResult = { profileId: string; platform: 'whatsapp' | 'telegram'; conversationId: string; conversationTitle: string; messageId: string; sender: string; text: string; translatedText?: string; timestamp: string; match: 'message' | 'translation' | 'sender' | 'conversation' }
type VaultStatus = { configured: boolean; trustedDevice: boolean; locked: boolean }

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
  lockProfiles: () => ipcRenderer.invoke('profiles:lock') as Promise<boolean>,
  unlockProfiles: () => ipcRenderer.invoke('profiles:unlock') as Promise<boolean>,
  getVaultStatus: () => ipcRenderer.invoke('profiles:vault:status') as Promise<VaultStatus>,
  configureVault: (password: string) => ipcRenderer.invoke('profiles:vault:configure', password) as Promise<VaultStatus>,
  unlockVault: (password?: string) => ipcRenderer.invoke('profiles:vault:unlock', password) as Promise<boolean>,
  lockVault: () => ipcRenderer.invoke('profiles:vault:lock') as Promise<boolean>,
  enableTrustedDevice: (password: string) => ipcRenderer.invoke('profiles:vault:trusted-enable', password) as Promise<VaultStatus>,
  disableTrustedDevice: () => ipcRenderer.invoke('profiles:vault:trusted-disable') as Promise<VaultStatus>,
  getConversationProfile: (profileId: string, conversationId: string) => ipcRenderer.invoke('conversation-profile:get', profileId, conversationId) as Promise<ConversationProfile | null>,
  listConversationProfiles: (profileId: string) => ipcRenderer.invoke('conversation-profile:list', profileId) as Promise<ConversationProfile[]>,
  setConversationProfile: (profile: ConversationProfile) => ipcRenderer.invoke('conversation-profile:set', profile) as Promise<ConversationProfile>,
  removeConversationProfile: (profileId: string, conversationId: string) => ipcRenderer.invoke('conversation-profile:remove', profileId, conversationId) as Promise<void>,
  setProviderSecret: (profileId: string, provider: TranslationProvider, value: string) => ipcRenderer.invoke('provider-secret:set', profileId, provider, value) as Promise<void>,
  hasProviderSecret: (profileId: string, provider: TranslationProvider) => ipcRenderer.invoke('provider-secret:has', profileId, provider) as Promise<boolean>,
  removeProviderSecret: (profileId: string, provider: TranslationProvider) => ipcRenderer.invoke('provider-secret:remove', profileId, provider) as Promise<void>,
  loadMessagesForProfile: (profileId: string) => ipcRenderer.invoke('messages:load-profile', profileId),
  loadUnifiedMessages: () => ipcRenderer.invoke('messages:load-unified'),
  loadUnifiedInbox: () => ipcRenderer.invoke('messages:load-inbox'),
  searchMessages: (query: string, limit?: number) => ipcRenderer.invoke('messages:search', query, limit) as Promise<TranslationSearchResult[]>,
  syncProfileMessages: (profileId: string) => ipcRenderer.invoke('messages:sync-profile', profileId),
  applyProviderSnapshot: (snapshot: ProviderSnapshot) => ipcRenderer.invoke('messages:apply-snapshot', snapshot),
  clearProfileMessages: (profileId: string) => ipcRenderer.invoke('messages:clear-profile', profileId),
  listTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:list', profileId),
  setTranslationMemoryEntry: (profileId: string, entry: DictionaryEntry) => ipcRenderer.invoke('translation-memory:set', profileId, entry),
  removeTranslationMemoryEntry: (profileId: string, source: string) => ipcRenderer.invoke('translation-memory:remove', profileId, source),
  clearTranslationMemory: (profileId: string) => ipcRenderer.invoke('translation-memory:clear', profileId),
  translate: (request: TranslationRequest) => ipcRenderer.invoke('translation:translate', request) as Promise<TranslationResult>,
  translateBatch: (requests: TranslationRequest[]) => ipcRenderer.invoke('translation:translate-batch', requests) as Promise<TranslationResult[]>,
  onQuickLock: (callback: () => void) => { const listener = () => callback(); ipcRenderer.on('profile:quick-lock', listener); return () => ipcRenderer.removeListener('profile:quick-lock', listener) },
  onVaultLockRequired: (callback: () => void) => { const listener = () => callback(); ipcRenderer.on('profile:vault-lock-required', listener); return () => ipcRenderer.removeListener('profile:vault-lock-required', listener) },
  onQuickSwitch: (callback: (index: number) => void) => { const listener = (_event: Electron.IpcRendererEvent, index: number) => callback(index); ipcRenderer.on('profile:quick-switch', listener); return () => ipcRenderer.removeListener('profile:quick-switch', listener) },
})