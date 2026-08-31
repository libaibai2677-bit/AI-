import { loadMessageStore } from './message-store'
import type { Conversation, Message } from '../../../../packages/messaging/src/types'

export type UnifiedMessageSearchResult = {
  profileId: string
  platform: Conversation['platform']
  conversationId: string
  conversationTitle: string
  messageId: string
  sender: string
  text: string
  translatedText?: string
  timestamp: string
}

/**
 * Local-only global search across every persisted Profile and provider.
 * Search never leaves the main process and never queries provider websites.
 */
export async function searchUnifiedMessages(query: string, limit = 50): Promise<UnifiedMessageSearchResult[]> {
  const normalized = query.trim().toLocaleLowerCase()
  if (!normalized) return []

  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 200)
  const state = await loadMessageStore()
  const conversations = new Map<string, Conversation>()

  for (const conversation of state.conversations) {
    conversations.set(`${conversation.profileId}:${conversation.id}`, conversation)
  }

  return state.messages
    .filter((message) => matches(message, normalized))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, safeLimit)
    .map((message) => {
      const conversation = conversations.get(`${message.profileId}:${message.conversationId}`)
      return {
        profileId: message.profileId,
        platform: message.platform,
        conversationId: message.conversationId,
        conversationTitle: conversation?.title ?? message.conversationId,
        messageId: message.id,
        sender: message.sender.displayName,
        text: message.text,
        translatedText: message.translatedText,
        timestamp: message.timestamp,
      }
    })
}

function matches(message: Message, query: string): boolean {
  return [message.text, message.translatedText ?? '', message.sender.displayName]
    .some((value) => value.toLocaleLowerCase().includes(query))
}
