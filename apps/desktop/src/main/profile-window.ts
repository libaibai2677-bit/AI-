import { BrowserWindow, screen } from 'electron'
import type { WebContents } from 'electron'
import type { StoredProfile } from './profile-store'
import { setProfileHealth, setProfileStatus, setProfileWindowState } from './profile-store'
import { hasProviderSecret } from './secret-store'
import { loadUnifiedInbox } from './message-store'

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

async function refreshSessionHealth(profile: StoredProfile, window: BrowserWindow) {
  if (window.isDestroyed()) return

  try {
    const loggedIn = await window.webContents.executeJavaScript(`
      (() => {
        const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase()
        const body = clean(document.body?.innerText)
        const url = location.href.toLowerCase()

        if (url.includes('whatsapp.com')) {
          const workspace = document.querySelector('[data-testid="chat-list"], [data-testid="side"], [data-testid="chat-list-search"]')
          const loginPrompt = body.includes('use whatsapp on your computer') || body.includes('scan the qr code')
          return Boolean(workspace) && !loginPrompt
        }

        const workspace = document.querySelector('.chatlist, [data-peer-id], #column-left, [class*="chatlist"]')
        const loginPrompt = body.includes('log in') && (body.includes('phone number') || body.includes('country'))
        return Boolean(workspace) && !loginPrompt
      })()
    `, true) as boolean

    if (loggedIn) {
      await setProfileStatus(profile.id, 'connected')
      await setProfileHealth(profile.id, 'session', 'connected')
    } else {
      await setProfileStatus(profile.id, 'attention')
      await setProfileHealth(profile.id, 'session', 'attention')
    }
  } catch {
    await setProfileStatus(profile.id, 'attention')
    await setProfileHealth(profile.id, 'session', 'attention')
  }
}

async function restoreLastConversation(window: BrowserWindow, profile: StoredProfile) {
  if (!profile.lastConversationId || window.isDestroyed()) return

  try {
    const inbox = await loadUnifiedInbox()
    const conversation = inbox.find(item => item.profileId === profile.id && item.id === profile.lastConversationId)
    if (!conversation || window.isDestroyed()) return

    const title = conversation.title || conversation.participant?.displayName
    if (!title) return

    const escapedTitle = JSON.stringify(title)
    await window.webContents.executeJavaScript(`
      (() => {
        const target = ${escapedTitle}.trim().toLowerCase()
        if (!target) return false
        const clean = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase()
        const candidates = Array.from(document.querySelectorAll('[role="listitem"], [data-peer-id], [data-testid="cell-frame-container"], .chatlist-chat'))
        const match = candidates.find((node) => clean(node.getAttribute('aria-label')) === target || clean(node.textContent).includes(target))
        if (!match) return false
        const element = match
        element.scrollIntoView({ block: 'nearest' })
        element.click()
        return true
      })()
    `, true)
  } catch {
    // Provider DOMs are third-party and can change. Failing to restore a
    // conversation must never prevent the isolated Profile from opening.
  }
}

export function openProfileWindow(profile: StoredProfile) {
  const existing = windows.get(profile.id)
  if (existing && !existing.isDestroyed()) {
    existing.show()
    existing.focus()
    hiddenForLock.delete(profile.id)
    void refreshSessionHealth(profile, existing)
    void refreshTranslationHealth(profile)
    void restoreLastConversation(existing, profile)
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
  void setProfileHealth(profile.id, 'network', 'connected')
  void refreshTranslationHealth(profile)

  window.webContents.on('did-fail-load', () => {
    void setProfileStatus(profile.id, 'attention')
    void setProfileHealth(profile.id, 'network', 'attention')
  })

  window.webContents.on('did-finish-load', () => {
    void setProfileHealth(profile.id, 'network', 'connected')
    void refreshSessionHealth(profile, window)
    void restoreLastConversation(window, profile)
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