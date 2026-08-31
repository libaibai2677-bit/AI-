import type { WebContents } from 'electron'
import type { ProviderSnapshot } from '../../../../packages/messaging/src/sync'
import type { Conversation, Message, MessagePlatform, Participant } from '../../../../packages/messaging/src/types'
import { applyProviderSnapshotPersisted } from './message-store'
import { getProfileWebContents } from './profile-window'
import { loadProfiles, setProfileHealth } from './profile-store'

type RuntimeRow = {
  id: string
  title: string
  preview?: string
  timestamp?: string
  unreadCount?: number
}

type RuntimeSnapshot = {
  conversations: RuntimeRow[]
  messages: Array<{
    id: string
    conversationId: string
    sender: string
    senderId?: string
    text: string
    timestamp: string
  }>
}

/** Read-only provider-page DOM reader; credentials and browser storage never enter the message model. */
export async function syncOpenProfile(profileId: string): Promise<{
  profileId: string
  platform: MessagePlatform
  conversations: number
  messages: number
  syncedAt: string
} | null> {
  const profile = (await loadProfiles()).find(item => item.id === profileId)
  if (!profile) throw new Error('Profile not found')

  const webContents = getProfileWebContents(profileId)
  if (!webContents || webContents.isDestroyed()) {
    await setProfileHealth(profileId, 'messages', 'disconnected')
    return null
  }

  const platform: MessagePlatform = profile.provider === 'WhatsApp' ? 'whatsapp' : 'telegram'
  try {
    const runtime = await collectRuntimeSnapshot(webContents, platform)
    const syncedAt = new Date().toISOString()
    const snapshot: ProviderSnapshot = {
      profileId,
      platform,
      conversations: runtime.conversations.map(row => normalizeConversation(profileId, platform, row)),
      messages: runtime.messages.map(row => normalizeMessage(profileId, platform, row)),
      syncedAt,
    }
    await applyProviderSnapshotPersisted(snapshot)
    await setProfileHealth(profileId, 'messages', 'connected')
    return { profileId, platform, conversations: snapshot.conversations.length, messages: snapshot.messages.length, syncedAt }
  } catch {
    await setProfileHealth(profileId, 'messages', 'attention')
    return null
  }
}

async function collectRuntimeSnapshot(webContents: WebContents, platform: MessagePlatform): Promise<RuntimeSnapshot> {
  const script = readProviderDom.toString()
  return webContents.executeJavaScript(`(${script})(${JSON.stringify(platform)})`, true) as Promise<RuntimeSnapshot>
}

/**
 * Conservative selectors for the rendered provider UI. Provider DOMs change,
 * so this reader is intentionally best-effort and read-only.
 */
function readProviderDom(platform: MessagePlatform): RuntimeSnapshot {
  const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()
  const parseTimestamp = (node: Element, fallback: string) => {
    const candidates = [
      node.getAttribute('data-timestamp'),
      node.getAttribute('data-time'),
      node.getAttribute('datetime'),
      node.querySelector('time')?.getAttribute('datetime'),
    ]
    for (const value of candidates) {
      if (!value) continue
      const parsed = Date.parse(value)
      if (!Number.isNaN(parsed)) return new Date(parsed).toISOString()
      if (/^\d{10,13}$/.test(value)) {
        const numeric = Number(value)
        const millis = value.length === 10 ? numeric * 1000 : numeric
        const date = new Date(millis)
        if (!Number.isNaN(date.getTime())) return date.toISOString()
      }
    }
    return fallback
  }
  const hash = (value: string) => {
    let h = 2166136261
    for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619)
    return `dom-${(h >>> 0).toString(16)}`
  }

  const now = new Date().toISOString()
  const conversationSelectors = platform === 'whatsapp'
    ? ['[role="listitem"]', 'div[data-testid="cell-frame-container"]']
    : ['[data-peer-id]', '.chatlist-chat', '[role="listitem"]']
  const nodes = Array.from(document.querySelectorAll(conversationSelectors.join(',')))
  const seen = new Set<string>()
  const conversations: RuntimeRow[] = []

  for (const node of nodes) {
    const el = node as HTMLElement
    const title = clean(el.getAttribute('aria-label')) || clean(el.querySelector('span[title], [dir="auto"]')?.textContent)
    if (!title || title.length > 120) continue
    const id = clean(el.getAttribute('data-peer-id')) || clean(el.getAttribute('data-id')) || hash(title)
    if (seen.has(id)) continue
    seen.add(id)
    const preview = clean(el.querySelector('[data-testid*="last-msg"], .message, .dialog-subtitle, [dir="auto"]')?.textContent)
    conversations.push({ id, title, preview, timestamp: parseTimestamp(el, now) })
    if (conversations.length >= 100) break
  }

  const messageSelectors = platform === 'whatsapp'
    ? ['[data-testid="msg-container"]', '[data-id*="-"]']
    : ['.message', '[data-mid]']
  const messageNodes = Array.from(document.querySelectorAll(messageSelectors.join(','))).slice(-200)
  const messages: RuntimeSnapshot['messages'] = []
  const activeTitle = clean(document.querySelector('[data-testid="conversation-header"] [dir="auto"], header [dir="auto"]')?.textContent)
  const activeConversationId = activeTitle
    ? (conversations.find(item => item.title === activeTitle)?.id ?? hash(activeTitle))
    : (conversations[0]?.id ?? hash('active'))

  for (const node of messageNodes) {
    const el = node as HTMLElement
    const text = clean(el.querySelector('.selectable-text, [data-testid="selectable-text"], .text-content, [dir="auto"]')?.textContent || el.textContent)
    if (!text || text.length > 4000) continue
    const sender = clean(el.querySelector('[data-pre-plain-text]')?.getAttribute('data-pre-plain-text')) || 'Unknown'
    const id = clean(el.getAttribute('data-id')) || clean(el.getAttribute('data-mid')) || hash(`${activeConversationId}:${sender}:${text}`)
    messages.push({
      id,
      conversationId: activeConversationId,
      sender,
      text,
      timestamp: parseTimestamp(el, now),
    })
  }

  return { conversations, messages }
}

function normalizeConversation(profileId: string, platform: MessagePlatform, row: RuntimeRow): Conversation {
  const participant: Participant = { id: row.id, displayName: row.title }
  const lastMessage = row.preview
    ? normalizeMessage(profileId, platform, {
        id: `preview-${row.id}`,
        conversationId: row.id,
        sender: row.title,
        text: row.preview,
        timestamp: row.timestamp ?? new Date().toISOString(),
      })
    : undefined
  return { id: row.id, profileId, platform, title: row.title, participant, lastMessage, unreadCount: row.unreadCount ?? 0 }
}

function normalizeMessage(profileId: string, platform: MessagePlatform, row: RuntimeSnapshot['messages'][number]): Message {
  return {
    id: row.id,
    profileId,
    conversationId: row.conversationId,
    platform,
    sender: { id: row.senderId ?? row.sender, displayName: row.sender },
    text: row.text,
    timestamp: row.timestamp,
    unread: false,
    mentioned: false,
    favorite: false,
    followUp: false,
  }
}
