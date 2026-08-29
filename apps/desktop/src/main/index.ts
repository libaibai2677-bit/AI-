import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import { createProfile, loadProfiles } from './profile-store'
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
  ipcMain.handle('profiles:create', (_event, input) => createProfile(input))
  ipcMain.handle('profiles:open', async (_event, profileId: string) => {
    const profiles = await loadProfiles()
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error('Profile not found')
    openProfileWindow(profile)
    return profile
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
