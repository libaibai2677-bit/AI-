import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Conversation, Message } from '../../../../packages/messaging/src/types'
import type { ProviderSnapshot } from '../../../../packages/messaging/src/sync'
import { buildUnifiedInbox } from '../../../../packages/message-core/src/live-inbox'

type PersistedMessageState = {
  version: 1
  conversations: Conversation[]
  messages: Message[]
  updatedAt: string
}

const emptyState = (): PersistedMessageState => ({
  version: 1,
  conversations: [],
  messages: [],
  updatedAt: new Date(0).toISOString(),
})

function storePath() {
  return path.join(app.getPath('userData'), 'message-store.json')
}

export async function loadMessageStore(): Promise<PersistedMessageState> {
  try {
    const raw = await readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw) as PersistedMessageState
    if (parsed.version !== 1 || !Array.isArray(parsed.conversations) || !Array.isArray(parsed.messages)) return emptyState()
    return parsed
  } catch {
    return emptyState()
  }
}

export async function saveMessageStore(state: PersistedMessageState): Promise<void> {
  await mkdir(path.dirname(storePath()), { recursive: true })
  const next = { ...state, updatedAt: new Date().toISOString() }
  await writeFile(storePath(), JSON.stringify(next, null, 2), 'utf8')
}

export async function applyProviderSnapshotPersisted(snapshot: ProviderSnapshot): Promise<PersistedMessageState> {
  const state = await loadMessageStore()
  const conversations = new Map(state.conversations.map(item => [scopedId(item.profileId, item.id), item]))
  const messages = new Map(state.messages.map(item => [scopedId(item.profileId, item.id), item]))

  for (const conversation of snapshot.conversations) {
    const key = scopedId(snapshot.profileId, conversation.id)
    const existing = conversations.get(key)
    conversations.set(key, existing ? { ...existing, ...conversation, profileId: snapshot.profileId } : { ...conversation, profileId: snapshot.profileId })
  }

  for (const message of snapshot.messages) {
    const key = scopedId(snapshot.profileId, message.id)
    const existing = messages.get(key)
    messages.set(key, existing ? { ...existing, ...message, profileId: snapshot.profileId } : { ...message, profileId: snapshot.profileId })
  }

  const next: PersistedMessageState = { version: 1, conversations: [...conversations.values()], messages: [...messages.values()], updatedAt: new Date().toISOString() }
  await saveMessageStore(next)
  return next
}

export async function updateMessageTranslation(profileId: string, messageId: string, translatedText: string): Promise<Message> {
  const state = await loadMessageStore()
  const key = scopedId(profileId, messageId)
  const index = state.messages.findIndex(item => scopedId(item.profileId, item.id) === key)
  if (index < 0) throw new Error('Message not found')
  const text = translatedText.trim()
  if (!text) throw new Error('Translated text is required')
  const updated: Message = { ...state.messages[index], translatedText: text }
  state.messages[index] = updated
  await saveMessageStore(state)
  return updated
}

export async function loadMessagesForProfile(profileId: string) {
  const state = await loadMessageStore()
  return { conversations: state.conversations.filter(item => item.profileId === profileId), messages: state.messages.filter(item => item.profileId === profileId) }
}

export async function loadUnifiedMessageState() { return loadMessageStore() }

export async function loadUnifiedInbox() {
  const state = await loadMessageStore()
  return buildUnifiedInbox(state.conversations, state.messages)
}

export async function clearPersistedProfileMessages(profileId: string): Promise<void> {
  const state = await loadMessageStore()
  await saveMessageStore({ version: 1, conversations: state.conversations.filter(item => item.profileId !== profileId), messages: state.messages.filter(item => item.profileId !== profileId), updatedAt: state.updatedAt })
}

function scopedId(profileId: string, id: string): string { return `${profileId}:${id}` }
