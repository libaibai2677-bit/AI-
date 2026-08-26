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

export function filterInbox(conversations: IndexedConversation[], filter: InboxFilter): IndexedConversation[] {
  switch (filter) {
    case 'unread': return conversations.filter(item => item.unreadCount > 0)
    case 'mentions': return conversations.filter(item => item.mentionCount > 0)
    case 'favorites': return conversations.filter(item => item.favorite)
    case 'follow-up': return conversations.filter(item => item.followUp)
    default: return conversations
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
    ].filter(Boolean).join('\n').toLocaleLowerCase()
    return haystack.includes(needle)
  }))
}
