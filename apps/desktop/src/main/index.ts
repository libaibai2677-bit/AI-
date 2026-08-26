import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'
import { ProfileManager } from '../../../../packages/profile-core/src/profile-manager'
import type { CreateProfileInput, Profile } from '../../../../packages/profile-core/src/types'
import { prepareProfileRuntime } from '../../../../packages/profile-core/src/profile-runtime'

let mainWindow: BrowserWindow | null = null
let profileManager: ProfileManager
let activeProfileId: string | null = null

type ProfileUpdate = Partial<Pick<Profile, 'name' | 'status' | 'language' | 'translation' | 'ai' | 'lastConversationId'>>

const activeProfilePath = () => path.join(app.getPath('userData'), 'active-profile.json')

async function loadActiveProfileId() {
  try {
    const raw = await fs.readFile(activeProfilePath(), 'utf8')
    const value = JSON.parse(raw) as { profileId?: string }
    activeProfileId = value.profileId ?? null
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
    if (code !== 'ENOENT') throw error
  }
}

async function saveActiveProfileId(profileId: string) {
  activeProfileId = profileId
  await fs.writeFile(activeProfilePath(), JSON.stringify({ profileId }, null, 2), 'utf8')
}

async function ensureDefaultProfiles() {
  if (profileManager.list().length > 0) return

  const defaults: CreateProfileInput[] = [
    { name: 'Personal', provider: 'whatsapp' },
    { name: 'Work', provider: 'whatsapp' },
    { name: 'Business', provider: 'whatsapp' },
    { name: 'Personal', provider: 'telegram', translation: { provider: 'google' } },
  ]

  for (const input of defaults) await profileManager.create(input)
}

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

app.whenReady().then(async () => {
  profileManager = new ProfileManager()
  await profileManager.init()
  await ensureDefaultProfiles()
  await loadActiveProfileId()

  if (!activeProfileId || !profileManager.get(activeProfileId)) {
    activeProfileId = profileManager.list()[0]?.id ?? null
    if (activeProfileId) await saveActiveProfileId(activeProfileId)
  }

  ipcMain.handle('app:version', () => app.getVersion())
  ipcMain.handle('profiles:list', () => profileManager.list())
  ipcMain.handle('profiles:get-active', () => activeProfileId)
  ipcMain.handle('profiles:set-active', async (_event, profileId: string) => {
    if (!profileManager.get(profileId)) throw new Error(`Profile not found: ${profileId}`)
    await saveActiveProfileId(profileId)
    return profileManager.get(profileId)
  })
  ipcMain.handle('profiles:create', async (_event, input: CreateProfileInput) => profileManager.create(input))
  ipcMain.handle('profiles:open', async (_event, profileId: string) => {
    const profile = profileManager.get(profileId)
    if (!profile) throw new Error(`Profile not found: ${profileId}`)

    const runtime = await prepareProfileRuntime(profile)
    await profileManager.updateStatus(profileId, 'connected')
    await saveActiveProfileId(profileId)
    return runtime
  })
  ipcMain.handle('profiles:update', async (_event, profileId: string, patch: ProfileUpdate) => profileManager.update(profileId, patch))

  createWindow()

  globalShortcut.register('CommandOrControl+Shift+L', () => {
    mainWindow?.webContents.send('profile:quick-lock')
  })

  for (let i = 1; i <= 9; i += 1) {
    globalShortcut.register(`CommandOrControl+${i}`, () => {
      mainWindow?.webContents.send('profile:quick-switch', i - 1)
    })
  }

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
