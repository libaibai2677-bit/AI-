import type { Conversation, Message } from '../../../messaging/src/types'
import type { IndexedConversation } from './unified-inbox'
import { sortInbox } from './unified-inbox'

export type ProfileLabel = {
  id: string
  name: string
}

/**
 * Builds the user-facing Unified Inbox from normalized provider data.
 * Profile identity stays attached to every conversation so two providers
 * can safely contain contacts with the same conversation id.
 */
export function buildUnifiedInbox(
  conversations: Conversation[],
  messages: Message[],
  profiles: ProfileLabel[] = [],
): IndexedConversation[] {
  const profileNames = new Map(profiles.map(profile => [profile.id, profile.name]))
  const messagesByConversation = new Map<string, Message[]>()

  for (const message of messages) {
    const key = scopedId(message.profileId, message.conversationId)
    const list = messagesByConversation.get(key) ?? []
    list.push(message)
    messagesByConversation.set(key, list)
  }

  const indexed = conversations.map((conversation): IndexedConversation => {
    const key = scopedId(conversation.profileId, conversation.id)
    const conversationMessages = messagesByConversation.get(key) ?? []
    const lastMessage = conversationMessages
      .slice()
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? conversation.lastMessage

    const unreadCount = conversationMessages.filter(message => message.unread).length || conversation.unreadCount
    const mentionCount = conversationMessages.filter(message => message.mentioned).length
    const favorite = conversationMessages.some(message => message.favorite)
    const followUp = conversationMessages.some(message => message.followUp)

    return {
      ...conversation,
      profileId: conversation.profileId,
      unreadCount,
      mentionCount,
      favorite,
      followUp,
      updatedAt: lastMessage?.timestamp ?? new Date(0).toISOString(),
      lastMessage,
    }
  })

  return sortInbox(indexed).map(item => ({
    ...item,
    profileId: profileNames.has(item.profileId) ? item.profileId : item.profileId,
  }))
}

function scopedId(profileId: string, id: string): string {
  return `${profileId}:${id}`
}
