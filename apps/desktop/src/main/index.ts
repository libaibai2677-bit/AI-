import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import { createProfile, loadActiveProfileId, loadProfiles, restoreProfileConfiguration, setActiveProfileId, setLastConversation } from './profile-store'
import { openProfileWindow } from './profile-window'
import { applyProviderSnapshotPersisted, clearPersistedProfileMessages, loadMessagesForProfile, loadUnifiedInbox, loadUnifiedMessageState } from './message-store'
import { clearDictionary, listDictionary, removeDictionaryEntry, setDictionaryEntry } from './translation-memory-store'
import { hasProviderSecret, removeProviderSecret, setProviderSecret } from './secret-store'
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

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    mainWindow?.webContents.send('profile:quick-lock')
  })

  for (let i = 1; i <= 9; i += 1) {
    globalShortcut.register(`CommandOrControl+${i}`, () => {
      mainWindow?.webContents.send('profile:quick-switch', i - 1)
    })
  }

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('profiles:list', () => loadProfiles())
  ipcMain.handle('profiles:active', () => loadActiveProfileId())
  ipcMain.handle('profiles:set-active', (_event, profileId: string) => setActiveProfileId(profileId))
  ipcMain.handle('profiles:create', (_event, input) => createProfile(input))
  ipcMain.handle('profiles:set-last-conversation', (_event, profileId: string, conversationId: string) => setLastConversation(profileId, conversationId))
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

    const result = await dialog.showSaveDialog(mainWindow ?? undefined, {
      title: 'Backup Profile',
      defaultPath: `${profile.name.replace(/[^a-z0-9-_]/gi, '_')}.profile.json`,
      filters: [{ name: 'Unified Chat Profile', extensions: ['profile.json'] }, { name: 'JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath) return { canceled: true }

    const { writeFile } = await import('node:fs/promises')
    const payload = {
      format: 'unified-chat-profile' as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      profile: {
        id: profile.id,
        name: profile.name,
        provider: profile.provider,
        translation: profile.translation,
        language: profile.language,
        lastConversationId: profile.lastConversationId,
      },
      note: 'Session cookies, credentials, tokens and browser storage are intentionally excluded from this backup.',
    }
    await writeFile(result.filePath, JSON.stringify(payload, null, 2), 'utf8')
    return { canceled: false, filePath: result.filePath }
  })
  ipcMain.handle('profiles:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: 'Restore Profile Configuration',
      properties: ['openFile'],
      filters: [{ name: 'Unified Chat Profile', extensions: ['profile.json', 'json'] }],
    })
    if (result.canceled || !result.filePaths[0]) return { canceled: true }

    const { readFile } = await import('node:fs/promises')
    const backup = JSON.parse(await readFile(result.filePaths[0], 'utf8')) as ProfileBackup
    const profile = await restoreProfileConfiguration(backup)
    return { canceled: false, profile }
  })

  // Secret values never cross the renderer boundary on reads. The main process
  // owns encrypted storage; the UI only needs set / presence / remove operations.
  ipcMain.handle('provider-secret:set', (_event, profileId: string, provider: 'DeepL' | 'Google', value: string) => setProviderSecret(profileId, provider, value))
  ipcMain.handle('provider-secret:has', (_event, profileId: string, provider: 'DeepL' | 'Google') => hasProviderSecret(profileId, provider))
  ipcMain.handle('provider-secret:remove', (_event, profileId: string, provider: 'DeepL' | 'Google') => removeProviderSecret(profileId, provider))

  ipcMain.handle('messages:load-profile', (_event, profileId: string) => loadMessagesForProfile(profileId))
  ipcMain.handle('messages:load-unified', () => loadUnifiedMessageState())
  ipcMain.handle('messages:load-inbox', () => loadUnifiedInbox())
  ipcMain.handle('messages:apply-snapshot', (_event, snapshot: ProviderSnapshot) => applyProviderSnapshotPersisted(snapshot))
  ipcMain.handle('messages:clear-profile', (_event, profileId: string) => clearPersistedProfileMessages(profileId))

  ipcMain.handle('translation-memory:list', (_event, profileId: string) => listDictionary(profileId))
  ipcMain.handle('translation-memory:set', (_event, profileId: string, entry) => setDictionaryEntry(profileId, entry))
  ipcMain.handle('translation-memory:remove', (_event, profileId: string, source: string) => removeDictionaryEntry(profileId, source))
  ipcMain.handle('translation-memory:clear', (_event, profileId: string) => clearDictionary(profileId))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
