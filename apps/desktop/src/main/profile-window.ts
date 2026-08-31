import { BrowserWindow, screen } from 'electron'
import type { StoredProfile } from './profile-store'
import { setProfileStatus, setProfileWindowState } from './profile-store'

const providerUrls = {
  WhatsApp: 'https://web.whatsapp.com/',
  Telegram: 'https://web.telegram.org/',
} as const

const windows = new Map<string, BrowserWindow>()

function safeBounds(profile: StoredProfile) {
  const saved = profile.windowState
  if (!saved) return { width: 1280, height: 820 }

  const display = screen.getDisplayNearestPoint({ x: saved.x ?? 0, y: saved.y ?? 0 })
  const workArea = display.workArea
  const width = Math.min(Math.max(saved.width, 960), workArea.width)
  const height = Math.min(Math.max(saved.height, 620), workArea.height)
  const x = saved.x === undefined ? undefined : Math.min(Math.max(saved.x, workArea.x), workArea.x + workArea.width - width)
  const y = saved.y === undefined ? undefined : Math.min(Math.max(saved.y, workArea.y), workArea.y + workArea.height - height)
  return { x, y, width, height }
}

export function openProfileWindow(profile: StoredProfile) {
  const existing = windows.get(profile.id)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    void setProfileStatus(profile.id, 'connected')
    return
  }

  const window = new BrowserWindow({
    ...safeBounds(profile),
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

  const persistWindowState = () => {
    if (window.isDestroyed()) return
    const bounds = window.getBounds()
    void setProfileWindowState(profile.id, bounds)
  }

  window.on('resize', persistWindowState)
  window.on('move', persistWindowState)
  window.on('closed', () => {
    persistWindowState()
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
