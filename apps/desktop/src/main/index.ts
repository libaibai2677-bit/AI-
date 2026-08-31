import { app, BrowserWindow, dialog, globalShortcut, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

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

  ipcMain.handle('profile:backup', async (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') throw new Error('Invalid profile backup payload')

    const result = await dialog.showSaveDialog(mainWindow!, {
      title: 'Export Profile Backup',
      defaultPath: 'Profile.profile',
      filters: [{ name: 'Unified Chat Profile', extensions: ['profile'] }],
    })

    if (result.canceled || !result.filePath) return { canceled: true }

    // Credentials, cookies, sessions and browser storage are deliberately not
    // accepted here. The renderer sends only portable profile configuration.
    await fs.writeFile(result.filePath, JSON.stringify({
      format: 'unified-chat-profile',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: payload,
    }, null, 2), 'utf8')

    return { canceled: false, path: result.filePath }
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
