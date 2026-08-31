import type { Message, Conversation } from './types'
import type { IndexedConversation } from './unified-inbox'
import { buildUnifiedInbox, filterInbox, getInboxFilterState, sortInbox, type InboxFilter, type InboxFilterState } from './unified-inbox'

export type ProfileInboxState = {
  profileId: string | 'all'
  filter: InboxFilter
  items: IndexedConversation[]
  filterState: InboxFilterState
}

/**
 * Profile is a first-class scope for the user-facing inbox. The renderer can
 * switch profiles without knowing anything about browser/profile storage.
 */
export function buildProfileInbox(
  conversations: Conversation[],
  messages: Message[],
  profileId: string | 'all',
  filter: InboxFilter = 'all',
): ProfileInboxState {
  const scoped = profileId === 'all'
    ? conversations
    : conversations.filter(item => item.profileId === profileId)
  const indexed = buildUnifiedInbox(scoped, messages.filter(message => profileId === 'all' || message.profileId === profileId))
  const filterState = getInboxFilterState(indexed, filter)

  return {
    profileId,
    filter,
    items: filterInbox(indexed, filter),
    filterState,
  }
}

/** Recomputes only the visible profile scope after a live inbox update. */
export function updateProfileInbox(
  current: ProfileInboxState,
  inbox: IndexedConversation[],
): ProfileInboxState {
  const scoped = current.profileId === 'all'
    ? inbox
    : inbox.filter(item => item.profileId === current.profileId)
  const sorted = sortInbox(scoped)
  const filterState = getInboxFilterState(sorted, current.filter)
  return {
    ...current,
    items: filterInbox(sorted, current.filter),
    filterState,
  }
}

export function listProfileConversationIds(
  conversations: Conversation[],
  profileId: string,
): string[] {
  return conversations
    .filter(item => item.profileId === profileId)
    .map(item => item.id)
}
