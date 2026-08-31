import type { Conversation, Message } from './types'

export interface ProviderSnapshot {
  profileId: string
  platform: Conversation['platform']
  conversations: Conversation[]
  messages: Message[]
  syncedAt: string
}

export interface MessageSyncStore {
  conversations: Map<string, Conversation>
  messages: Map<string, Message>
}

export function createMessageSyncStore(): MessageSyncStore {
  return { conversations: new Map(), messages: new Map() }
}

/** Merge a provider snapshot into the normalized local message model. */
export function applyProviderSnapshot(store: MessageSyncStore, snapshot: ProviderSnapshot): void {
  for (const conversation of snapshot.conversations) {
    const key = scopedId(snapshot.profileId, conversation.id)
    const existing = store.conversations.get(key)
    store.conversations.set(key, existing
      ? { ...existing, ...conversation, profileId: snapshot.profileId }
      : { ...conversation, profileId: snapshot.profileId })
  }

  for (const message of snapshot.messages) {
    const key = scopedId(snapshot.profileId, message.id)
    const existing = store.messages.get(key)
    store.messages.set(key, existing
      ? { ...existing, ...message, profileId: snapshot.profileId }
      : { ...message, profileId: snapshot.profileId })
  }
}

export function getConversationsForProfile(store: MessageSyncStore, profileId: string): Conversation[] {
  return [...store.conversations.values()].filter(item => item.profileId === profileId)
}

export function getMessagesForConversation(
  store: MessageSyncStore,
  profileId: string,
  conversationId: string,
): Message[] {
  return [...store.messages.values()]
    .filter(item => item.profileId === profileId && item.conversationId === conversationId)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

export function clearProfile(store: MessageSyncStore, profileId: string): void {
  for (const [key, item] of store.conversations) {
    if (item.profileId === profileId) store.conversations.delete(key)
  }
  for (const [key, item] of store.messages) {
    if (item.profileId === profileId) store.messages.delete(key)
  }
}

function scopedId(profileId: string, id: string): string {
  return `${profileId}:${id}`
}
