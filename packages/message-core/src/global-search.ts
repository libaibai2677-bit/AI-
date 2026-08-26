import type { Message } from './types'
import type { IndexedConversation } from './unified-inbox'

export interface GlobalSearchResult {
  conversation: IndexedConversation
  message?: Message
}

/** Cross-profile, cross-platform search for the unified inbox. */
export function searchMessages(
  conversations: IndexedConversation[],
  messages: Message[],
  query: string,
): GlobalSearchResult[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return conversations.map(conversation => ({ conversation }))

  const matchedConversationIds = new Set(
    conversations
      .filter(conversation => [
        conversation.title,
        conversation.platform,
        conversation.profileId,
        conversation.lastMessage?.text,
      ].filter(Boolean).join('\n').toLocaleLowerCase().includes(needle))
      .map(conversation => conversation.id),
  )

  const results: GlobalSearchResult[] = []
  for (const conversation of conversations) {
    if (matchedConversationIds.has(conversation.id)) {
      results.push({ conversation })
      continue
    }

    const match = messages
      .filter(message => message.conversationId === conversation.id)
      .find(message => message.text.toLocaleLowerCase().includes(needle))

    if (match) results.push({ conversation, message: match })
  }

  return results.sort((a, b) => b.conversation.updatedAt.localeCompare(a.conversation.updatedAt))
}
