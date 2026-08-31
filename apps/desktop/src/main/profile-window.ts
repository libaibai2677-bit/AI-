import { BrowserWindow } from 'electron'
import type { StoredProfile } from './profile-store'
import { setProfileStatus } from './profile-store'

const providerUrls = {
  WhatsApp: 'https://web.whatsapp.com/',
  Telegram: 'https://web.telegram.org/',
} as const

const windows = new Map<string, BrowserWindow>()

export function openProfileWindow(profile: StoredProfile) {
  const existing = windows.get(profile.id)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    void setProfileStatus(profile.id, 'connected')
    return
  }

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    title: `${profile.provider} · ${profile.name}`,
    webPreferences: {
      // Provider pages are untrusted third-party web content. Do not expose the
      // Unified Chat preload bridge to them; the application UI owns that bridge.
      partition: `persist:unified-chat-${profile.id}`,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  windows.set(profile.id, window)
  void setProfileStatus(profile.id, 'connected')

  window.webContents.on('did-fail-load', () => {
    void setProfileStatus(profile.id, 'attention')
  })

  window.webContents.on('did-finish-load', () => {
    void setProfileStatus(profile.id, 'connected')
  })

  window.on('closed', () => {
    windows.delete(profile.id)
    void setProfileStatus(profile.id, 'disconnected')
  })

  void window.loadURL(providerUrls[profile.provider])
}

export function closeProfileWindows() {
  for (const [profileId, window] of windows.entries()) {
    if (!window.isDestroyed()) window.close()
    void setProfileStatus(profileId, 'disconnected')
  }
  windows.clear()
}
