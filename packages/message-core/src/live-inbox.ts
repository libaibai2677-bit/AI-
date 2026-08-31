import type { Conversation, Message } from '../../../messaging/src/types'
import type { IndexedConversation } from './unified-inbox'
import { sortInbox } from './unified-inbox'

export type InboxUpdate = {
  type: 'conversation-updated' | 'conversation-removed'
  profileId: string
  conversationId: string
  conversation?: IndexedConversation
}

/**
 * Builds the user-facing Unified Inbox from normalized provider data.
 * Profile identity stays attached to every conversation so two providers
 * can safely contain contacts with the same conversation id.
 */
export function buildUnifiedInbox(
  conversations: Conversation[],
  messages: Message[],
): IndexedConversation[] {
  const messagesByConversation = indexMessages(messages)

  const indexed = conversations.map((conversation): IndexedConversation => {
    return indexConversation(conversation, messagesByConversation)
  })

  return sortInbox(indexed)
}

/**
 * Applies one normalized message without rebuilding the entire inbox.
 * This is the bridge for provider listeners once WhatsApp/Telegram events
 * are normalized into the Message model.
 */
export function applyMessageUpdate(
  inbox: IndexedConversation[],
  conversations: Conversation[],
  message: Message,
): { inbox: IndexedConversation[]; update: InboxUpdate } {
  const conversation = conversations.find(item =>
    item.profileId === message.profileId && item.id === message.conversationId,
  )

  if (!conversation) {
    return {
      inbox,
      update: {
        type: 'conversation-removed',
        profileId: message.profileId,
        conversationId: message.conversationId,
      },
    }
  }

  const existing = inbox.find(item =>
    item.profileId === message.profileId && item.id === message.conversationId,
  )

  const next: IndexedConversation = {
    ...(existing ?? conversation),
    unreadCount: (existing?.unreadCount ?? conversation.unreadCount) + (message.unread ? 1 : 0),
    mentionCount: (existing?.mentionCount ?? 0) + (message.mentioned ? 1 : 0),
    favorite: existing?.favorite ?? Boolean(message.favorite),
    followUp: existing?.followUp ?? Boolean(message.followUp),
    updatedAt: message.timestamp,
    lastMessage: message,
  }

  const withoutCurrent = inbox.filter(item => !(
    item.profileId === message.profileId && item.id === message.conversationId
  ))

  const nextInbox = sortInbox([...withoutCurrent, next])

  return {
    inbox: nextInbox,
    update: {
      type: 'conversation-updated',
      profileId: message.profileId,
      conversationId: message.conversationId,
      conversation: next,
    },
  }
}

export function removeConversationUpdate(
  inbox: IndexedConversation[],
  profileId: string,
  conversationId: string,
): { inbox: IndexedConversation[]; update: InboxUpdate } {
  const nextInbox = inbox.filter(item => !(item.profileId === profileId && item.id === conversationId))
  return {
    inbox: nextInbox,
    update: {
      type: 'conversation-removed',
      profileId,
      conversationId,
    },
  }
}

function indexMessages(messages: Message[]): Map<string, Message[]> {
  const result = new Map<string, Message[]>()
  for (const message of messages) {
    const key = scopedId(message.profileId, message.conversationId)
    const list = result.get(key) ?? []
    list.push(message)
    result.set(key, list)
  }
  return result
}

function indexConversation(
  conversation: Conversation,
  messagesByConversation: Map<string, Message[]>,
): IndexedConversation {
  const key = scopedId(conversation.profileId, conversation.id)
  const conversationMessages = messagesByConversation.get(key) ?? []
  const lastMessage = conversationMessages
    .slice()
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0] ?? conversation.lastMessage

  return {
    ...conversation,
    unreadCount: conversationMessages.filter(message => message.unread).length || conversation.unreadCount,
    mentionCount: conversationMessages.filter(message => message.mentioned).length,
    favorite: conversationMessages.some(message => message.favorite),
    followUp: conversationMessages.some(message => message.followUp),
    updatedAt: lastMessage?.timestamp ?? new Date(0).toISOString(),
    lastMessage,
  }
}

function scopedId(profileId: string, id: string): string {
  return `${profileId}:${id}`
}
