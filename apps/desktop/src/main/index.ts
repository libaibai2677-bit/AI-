import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import { createProfile, loadActiveProfileId, loadProfiles, setActiveProfileId, setLastConversation } from './profile-store'
import { openProfileWindow } from './profile-window'

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
      format: 'unified-chat-profile',
      version: 1,
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
