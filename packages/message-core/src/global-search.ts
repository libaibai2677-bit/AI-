import type { Message } from '../../../messaging/src/types'
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

  const matchedConversationKeys = new Set(
    conversations
      .filter(conversation => [
        conversation.title,
        conversation.platform,
        conversation.profileId,
        conversation.lastMessage?.text,
        conversation.lastMessage?.translatedText,
      ].filter(Boolean).join('\n').toLocaleLowerCase().includes(needle))
      .map(conversation => scopedId(conversation.profileId, conversation.id)),
  )

  const results: GlobalSearchResult[] = []
  const matchedMessageKeys = new Set<string>()

  for (const conversation of conversations) {
    const conversationKey = scopedId(conversation.profileId, conversation.id)
    if (matchedConversationKeys.has(conversationKey)) {
      results.push({ conversation })
      continue
    }

    const match = messages
      .filter(message => scopedId(message.profileId, message.conversationId) === conversationKey)
      .find(message => [message.text, message.translatedText]
        .filter(Boolean)
        .join('\n')
        .toLocaleLowerCase()
        .includes(needle))

    if (match) {
      matchedMessageKeys.add(scopedId(match.profileId, match.id))
      results.push({ conversation, message: match })
    }
  }

  return results.sort((a, b) => {
    const aTime = a.message?.timestamp ?? a.conversation.updatedAt
    const bTime = b.message?.timestamp ?? b.conversation.updatedAt
    return bTime.localeCompare(aTime)
  })
}

function scopedId(profileId: string, id: string): string {
  return `${profileId}:${id}`
}
