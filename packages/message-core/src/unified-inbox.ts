import type { Conversation, Message } from './types'

export type InboxFilter = 'all' | 'unread' | 'mentions' | 'favorites' | 'follow-up'

export interface IndexedConversation extends Conversation {
  profileId: string
  unreadCount: number
  mentionCount: number
  favorite: boolean
  followUp: boolean
  updatedAt: string
  lastMessage?: Message
}

export interface InboxFilterState {
  active: InboxFilter
  counts: Record<InboxFilter, number>
}

export function filterInbox(conversations: IndexedConversation[], filter: InboxFilter): IndexedConversation[] {
  switch (filter) {
    case 'unread': return conversations.filter(item => item.unreadCount > 0)
    case 'mentions': return conversations.filter(item => item.mentionCount > 0)
    case 'favorites': return conversations.filter(item => item.favorite)
    case 'follow-up': return conversations.filter(item => item.followUp)
    default: return conversations
  }
}

export function getInboxFilterState(
  conversations: IndexedConversation[],
  active: InboxFilter = 'all',
): InboxFilterState {
  return {
    active,
    counts: {
      all: conversations.length,
      unread: conversations.filter(item => item.unreadCount > 0).length,
      mentions: conversations.filter(item => item.mentionCount > 0).length,
      favorites: conversations.filter(item => item.favorite).length,
      'follow-up': conversations.filter(item => item.followUp).length,
    },
  }
}

export function applyInboxFilterState(
  conversations: IndexedConversation[],
  state: InboxFilterState,
): { items: IndexedConversation[]; state: InboxFilterState } {
  const normalized = getInboxFilterState(conversations, state.active)
  return {
    items: filterInbox(conversations, normalized.active),
    state: normalized,
  }
}

export function sortInbox(conversations: IndexedConversation[]): IndexedConversation[] {
  return [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function searchInbox(conversations: IndexedConversation[], query: string): IndexedConversation[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return sortInbox(conversations)
  return sortInbox(conversations.filter(item => {
    const haystack = [
      item.title,
      item.platform,
      item.profileId,
      item.lastMessage?.text,
      item.lastMessage?.translatedText,
    ].filter(Boolean).join('\n').toLocaleLowerCase()
    return haystack.includes(needle)
  }))
}
