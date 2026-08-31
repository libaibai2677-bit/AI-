import type { MessagingProvider } from './provider'
import type { ProviderSnapshot } from './sync'
import type { Conversation, Message } from './types'

export interface ProviderSnapshotSink {
  apply(snapshot: ProviderSnapshot): Promise<unknown> | unknown
}

export interface ProviderSyncResult {
  profileId: string
  platform: Conversation['platform']
  conversations: number
  messages: number
  syncedAt: string
}

/**
 * Pull normalized data from a provider adapter and hand it to the Message Layer.
 *
 * This service deliberately knows nothing about provider DOMs, cookies, tokens,
 * or browser storage. Provider adapters own connection details; the sink owns
 * local persistence. That keeps the four-layer boundary intact.
 */
export async function syncProviderProfile(
  provider: MessagingProvider,
  profile: Parameters<MessagingProvider['createView']>[0],
  sink: ProviderSnapshotSink,
): Promise<ProviderSyncResult | null> {
  if (!provider.getConversations) return null

  const conversations = await provider.getConversations(profile)
  const messages: Message[] = []

  if (provider.getMessages) {
    for (const conversation of conversations) {
      let cursor: string | undefined
      do {
        const page = await provider.getMessages(profile, conversation.id, cursor)
        messages.push(...page.messages)
        cursor = page.nextCursor
      } while (cursor)
    }
  }

  const syncedAt = new Date().toISOString()
  const snapshot: ProviderSnapshot = {
    profileId: profile.id,
    platform: provider.id,
    conversations: normalizeConversations(profile.id, provider.id, conversations),
    messages: normalizeMessages(profile.id, provider.id, messages),
    syncedAt,
  }

  await sink.apply(snapshot)

  return {
    profileId: profile.id,
    platform: provider.id,
    conversations: snapshot.conversations.length,
    messages: snapshot.messages.length,
    syncedAt,
  }
}

function normalizeConversations(
  profileId: string,
  platform: Conversation['platform'],
  conversations: Conversation[],
): Conversation[] {
  return conversations.map((conversation) => ({
    ...conversation,
    profileId,
    platform,
    lastMessage: conversation.lastMessage
      ? { ...conversation.lastMessage, profileId, platform }
      : undefined,
  }))
}

function normalizeMessages(
  profileId: string,
  platform: Message['platform'],
  messages: Message[],
): Message[] {
  return messages.map((message) => ({ ...message, profileId, platform }))
}
