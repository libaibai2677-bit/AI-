import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import { createProfile, loadActiveProfileId, loadProfiles, restoreProfileConfiguration, setActiveProfileId, setLastConversation, setProfileHealth, setProfileStatus, setProfileWindowState } from './profile-store'
import { lockProfileWindows, openProfileWindow, unlockProfileWindows } from './profile-window'
import { applyProviderSnapshotPersisted, clearPersistedProfileMessages, loadMessagesForProfile, loadUnifiedInbox, loadUnifiedMessageState } from './message-store'
import { searchUnifiedMessages } from './message-search'
import { syncOpenProfile } from './provider-runtime-sync'
import { clearDictionary, listDictionary, removeDictionaryEntry, setDictionaryEntry } from './translation-memory-store'
import { hasProviderSecret, removeProviderSecret, setProviderSecret } from './secret-store'
import { translateBatch, translateText } from './translation-service'
import { getConversationProfile, listConversationProfiles, removeConversationProfile, setConversationProfile } from './conversation-profile-store'
import { configureVault, disableTrustedDevice, enableTrustedDevice, getVaultStatus, lockVault, unlockVault, unlockFromTrustedDevice } from './profile-vault'
import type { ConversationProfile } from '../../../../packages/messaging/src/conversation-profile'
import type { ProviderSnapshot } from '../../../../packages/messaging/src/sync'
import type { ProfileBackup } from './profile-store'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#0b0d10',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  else void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(async () => {
  createWindow()

  const trustedUnlocked = await unlockFromTrustedDevice()
  if (!trustedUnlocked && (await getVaultStatus()).configured) {
    mainWindow?.webContents.once('did-finish-load', () => mainWindow?.webContents.send('profile:vault-lock-required'))
  }

  globalShortcut.register('CommandOrControl+Shift+L', async () => {
    if (await lockVault()) {
      lockProfileWindows()
      mainWindow?.webContents.send('profile:quick-lock')
    }
  })

  for (let i = 1; i <= 9; i += 1) {
    globalShortcut.register(`CommandOrControl+${i}`, () => mainWindow?.webContents.send('profile:quick-switch', i - 1))
  }

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('profiles:list', () => loadProfiles())
  ipcMain.handle('profiles:active', () => loadActiveProfileId())
  ipcMain.handle('profiles:set-active', (_event, profileId: string) => setActiveProfileId(profileId))
  ipcMain.handle('profiles:create', (_event, input) => createProfile(input))
  ipcMain.handle('profiles:set-last-conversation', (_event, profileId: string, conversationId: string) => setLastConversation(profileId, conversationId))
  ipcMain.handle('profiles:set-health', (_event, profileId: string, component: 'session' | 'network' | 'messages' | 'translation', status: 'connected' | 'attention' | 'disconnected' | 'not-configured') => setProfileHealth(profileId, component, status))
  ipcMain.handle('profiles:set-status', (_event, profileId: string, status: 'connected' | 'attention' | 'disconnected' | 'not-configured') => setProfileStatus(profileId, status))
  ipcMain.handle('profiles:set-window-state', (_event, profileId: string, bounds) => setProfileWindowState(profileId, bounds))
  ipcMain.handle('profiles:open', async (_event, profileId: string) => {
    const profiles = await loadProfiles()
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error('Profile not found')
    await setActiveProfileId(profileId)
    openProfileWindow(profile)
    return profile
  })
  ipcMain.handle('profiles:backup', async (_event, profileId: string) => {
    const profiles = await loadProfiles()
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error('Profile not found')
    const result = await dialog.showSaveDialog(mainWindow ?? undefined, { title: 'Backup Profile', defaultPath: `${profile.name.replace(/[^a-z0-9-_]/gi, '_')}.profile.json`, filters: [{ name: 'Unified Chat Profile', extensions: ['profile.json'] }, { name: 'JSON', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return { canceled: true }
    const { writeFile } = await import('node:fs/promises')
    const payload: ProfileBackup = { format: 'unified-chat-profile', version: 1, exportedAt: new Date().toISOString(), profile: { id: profile.id, name: profile.name, provider: profile.provider, translation: profile.translation, language: profile.language, lastConversationId: profile.lastConversationId, windowState: profile.windowState } }
    await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { canceled: false, filePath: result.filePath }
  })
  ipcMain.handle('profiles:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, { title: 'Restore Profile Configuration', properties: ['openFile'], filters: [{ name: 'Unified Chat Profile', extensions: ['profile.json', 'json'] }] })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }
    const { readFile } = await import('node:fs/promises')
    const backup = JSON.parse(await readFile(result.filePaths[0], 'utf8')) as ProfileBackup
    const profile = await restoreProfileConfiguration(backup)
    return { canceled: false, profile }
  })

  ipcMain.handle('profiles:vault:status', () => getVaultStatus())
  ipcMain.handle('profiles:vault:configure', (_event, password: string) => configureVault(password))
  ipcMain.handle('profiles:vault:unlock', async (_event, password?: string) => {
    const success = password ? await unlockVault(password) : await unlockFromTrustedDevice()
    if (success) unlockProfileWindows()
    return success
  })
  ipcMain.handle('profiles:vault:lock', async () => {
    const success = await lockVault()
    if (success) lockProfileWindows()
    return success
  })
  ipcMain.handle('profiles:vault:trusted-enable', (_event, password: string) => enableTrustedDevice(password))
  ipcMain.handle('profiles:vault:trusted-disable', () => disableTrustedDevice())

  ipcMain.handle('conversation-profile:get', (_event, profileId: string, conversationId: string) => getConversationProfile(profileId, conversationId))
  ipcMain.handle('conversation-profile:list', (_event, profileId: string) => listConversationProfiles(profileId))
  ipcMain.handle('conversation-profile:set', (_event, profile: ConversationProfile) => setConversationProfile(profile))
  ipcMain.handle('conversation-profile:remove', (_event, profileId: string, conversationId: string) => removeConversationProfile(profileId, conversationId))

  ipcMain.handle('provider-secret:set', (_event, profileId: string, provider: 'DeepL' | 'Google', value: string) => setProviderSecret(profileId, provider, value))
  ipcMain.handle('provider-secret:has', (_event, profileId: string, provider: 'DeepL' | 'Google') => hasProviderSecret(profileId, provider))
  ipcMain.handle('provider-secret:remove', (_event, profileId: string, provider: 'DeepL' | 'Google') => removeProviderSecret(profileId, provider))

  ipcMain.handle('messages:load-profile', (_event, profileId: string) => loadMessagesForProfile(profileId))
  ipcMain.handle('messages:load-unified', () => loadUnifiedMessageState())
  ipcMain.handle('messages:load-inbox', () => loadUnifiedInbox())
  ipcMain.handle('messages:search', (_event, query: string, limit?: number) => searchUnifiedMessages(query, limit))
  ipcMain.handle('messages:apply-snapshot', (_event, snapshot: ProviderSnapshot) => applyProviderSnapshotPersisted(snapshot))
  ipcMain.handle('messages:sync-profile', (_event, profileId: string) => syncOpenProfile(profileId))
  ipcMain.handle('messages:clear-profile', (_event, profileId: string) => clearPersistedProfileMessages(profileId))

  ipcMain.handle('translation-memory:list', (_event, profileId: string) => listDictionary(profileId))
  ipcMain.handle('translation-memory:set', (_event, profileId: string, entry) => setDictionaryEntry(profileId, entry))
  ipcMain.handle('translation-memory:remove', (_event, profileId: string, source: string) => removeDictionaryEntry(profileId, source))
  ipcMain.handle('translation-memory:clear', (_event, profileId: string) => clearDictionary(profileId))
  ipcMain.handle('translation:translate', (_event, request) => translateText(request))
  ipcMain.handle('translation:translate-batch', (_event, requests) => translateBatch(requests))

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('will-quit', () => { globalShortcut.unregisterAll() })
