import { BrowserWindow } from 'electron'
import path from 'node:path'
import type { StoredProfile } from './profile-store'

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
    return
  }

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 620,
    title: `${profile.provider} · ${profile.name}`,
    webPreferences: {
      partition: `persist:unified-chat-${profile.id}`,
      preload: path.join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  windows.set(profile.id, window)
  window.on('closed', () => windows.delete(profile.id))
  void window.loadURL(providerUrls[profile.provider])
}

export function closeProfileWindows() {
  for (const window of windows.values()) {
    if (!window.isDestroyed()) window.close()
  }
  windows.clear()
}
