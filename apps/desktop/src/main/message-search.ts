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
  match: 'message' | 'translation' | 'sender' | 'conversation'
}

/**
 * Local-only global search across every persisted Profile and provider.
 * Search never leaves the main process and never queries provider websites.
 *
 * Conversation-title matches are included so a user can find a chat even when
 * the query does not occur in the message body. Message matches remain ranked
 * ahead of conversation-only matches.
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
    .map((message) => {
      const conversation = conversations.get(`${message.profileId}:${message.conversationId}`)
      const match = getMatchType(message, conversation, normalized)
      return match ? { message, conversation, match } : null
    })
    .filter((item): item is { message: Message; conversation?: Conversation; match: UnifiedMessageSearchResult['match'] } => item !== null)
    .sort((a, b) => {
      const rank = (match: UnifiedMessageSearchResult['match']) => match === 'conversation' ? 1 : 0
      const rankDifference = rank(a.match) - rank(b.match)
      if (rankDifference !== 0) return rankDifference
      return b.message.timestamp.localeCompare(a.message.timestamp)
    })
    .slice(0, safeLimit)
    .map(({ message, conversation, match }) => ({
      profileId: message.profileId,
      platform: message.platform,
      conversationId: message.conversationId,
      conversationTitle: conversation?.title ?? message.conversationId,
      messageId: message.id,
      sender: message.sender.displayName,
      text: message.text,
      translatedText: message.translatedText,
      timestamp: message.timestamp,
      match,
    }))
}

function getMatchType(message: Message, conversation: Conversation | undefined, query: string): UnifiedMessageSearchResult['match'] | null {
  if (message.text.toLocaleLowerCase().includes(query)) return 'message'
  if ((message.translatedText ?? '').toLocaleLowerCase().includes(query)) return 'translation'
  if (message.sender.displayName.toLocaleLowerCase().includes(query)) return 'sender'
  if ((conversation?.title ?? '').toLocaleLowerCase().includes(query)) return 'conversation'
  return null
}
