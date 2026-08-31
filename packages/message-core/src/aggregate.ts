import type { Conversation, Message } from './types'
import type { IndexedConversation } from './unified-inbox'

export interface ProfileMessageSet {
  profileId: string
  conversations: Conversation[]
  messages: Message[]
}

/** Build one inbox view from multiple isolated Profiles. */
export function aggregateProfiles(sets: ProfileMessageSet[]): {
  conversations: IndexedConversation[]
  messages: Message[]
} {
  const conversations: IndexedConversation[] = []
  const messages: Message[] = []

  for (const set of sets) {
    const byConversation = new Map<string, Message[]>()
    for (const message of set.messages) {
      messages.push({ ...message, profileId: set.profileId })
      const list = byConversation.get(message.conversationId) ?? []
      list.push(message)
      byConversation.set(message.conversationId, list)
    }

    for (const conversation of set.conversations) {
      const related = byConversation.get(conversation.id) ?? []
      const lastMessage = [...related].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0]
      conversations.push({
        ...conversation,
        profileId: set.profileId,
        unreadCount: conversation.unreadCount,
        mentionCount: related.filter(message => message.mentioned).length,
        favorite: related.some(message => message.favorite),
        followUp: related.some(message => message.followUp),
        updatedAt: lastMessage?.timestamp ?? conversation.lastMessage?.timestamp ?? '',
        lastMessage: lastMessage ?? conversation.lastMessage,
      })
    }
  }

  return { conversations, messages }
}
