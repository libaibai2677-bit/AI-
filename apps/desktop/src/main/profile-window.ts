import { BrowserWindow, screen } from 'electron'
import type { WebContents } from 'electron'
import type { StoredProfile } from './profile-store'
import { setProfileHealth, setProfileStatus, setProfileWindowState } from './profile-store'
import { hasProviderSecret } from './secret-store'

const providerUrls = {
  WhatsApp: 'https://web.whatsapp.com/',
  Telegram: 'https://web.telegram.org/',
} as const

const windows = new Map<string, BrowserWindow>()
const hiddenForLock = new Set<string>()

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

export function getProfileWebContents(profileId: string): WebContents | undefined {
  const window = windows.get(profileId)
  if (!window || window.isDestroyed()) return undefined
  return window.webContents
}

async function refreshTranslationHealth(profile: StoredProfile) {
  const [deepl, google] = await Promise.all([
    hasProviderSecret(profile.id, 'DeepL'),
    hasProviderSecret(profile.id, 'Google'),
  ])
  await setProfileHealth(profile.id, 'translation', deepl || google ? 'connected' : 'not-configured')
}

export function openProfileWindow(profile: StoredProfile) {
  const existing = windows.get(profile.id)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    hiddenForLock.delete(profile.id)
    void setProfileStatus(profile.id, 'connected')
    void setProfileHealth(profile.id, 'network', 'connected')
    void refreshTranslationHealth(profile)
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
  void setProfileHealth(profile.id, 'network', 'connected')
  void refreshTranslationHealth(profile)

  window.webContents.on('did-fail-load', () => {
    void setProfileStatus(profile.id, 'attention')
    void setProfileHealth(profile.id, 'network', 'attention')
  })

  window.webContents.on('did-finish-load', () => {
    if (!hiddenForLock.has(profile.id)) void setProfileStatus(profile.id, 'connected')
    void setProfileHealth(profile.id, 'network', 'connected')
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
    hiddenForLock.delete(profile.id)
    void setProfileStatus(profile.id, 'disconnected')
    void setProfileHealth(profile.id, 'network', 'disconnected')
    void setProfileHealth(profile.id, 'messages', 'disconnected')
  })

  void window.loadURL(providerUrls[profile.provider])
}

/** Hide provider windows while the main UI is locked. Windows stay alive so sessions are not lost. */
export function lockProfileWindows() {
  for (const [profileId, window] of windows.entries()) {
    if (window.isDestroyed()) continue
    if (window.isVisible()) {
      hiddenForLock.add(profileId)
      window.hide()
    }
  }
}

/** Restore only provider windows that were hidden by Quick Lock. */
export function unlockProfileWindows() {
  for (const profileId of hiddenForLock) {
    const window = windows.get(profileId)
    if (window && !window.isDestroyed()) window.show()
  }
  hiddenForLock.clear()
}

export function closeProfileWindows() {
  for (const [profileId, window] of windows.entries()) {
    if (!window.isDestroyed()) window.close()
    void setProfileStatus(profileId, 'disconnected')
    void setProfileHealth(profileId, 'network', 'disconnected')
    void setProfileHealth(profileId, 'messages', 'disconnected')
  }
  hiddenForLock.clear()
  windows.clear()
}