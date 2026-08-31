type InboxUpdate = {
  type: 'conversation-updated' | 'conversation-removed'
  profileId: string
  conversationId: string
  conversation?: unknown
}

type ConversationLike = {
  id: string
  profileId: string
}

type InboxUpdater<T extends ConversationLike> = (
  current: T[],
  update: InboxUpdate,
) => T[]

/**
 * Subscribes a renderer surface to incremental Unified Inbox events.
 * The caller remains the source of truth for React state. This helper only
 * owns the event subscription and applies each event through the supplied
 * updater, so there is no second hidden inbox state in the controller.
 */
export function subscribeLiveInbox<T extends ConversationLike>(
  getCurrent: () => T[],
  setCurrent: (next: T[]) => void,
  updater: InboxUpdater<T>,
): () => void {
  const cleanup = window.unifiedChat?.onInboxUpdate((update) => {
    const next = updater(getCurrent(), update)
    setCurrent(next)
  })

  return cleanup ?? (() => undefined)
}

export function applyLiveInboxUpdate<T extends ConversationLike>(
  current: T[],
  update: InboxUpdate,
  mapConversation: (conversation: unknown) => T,
): T[] {
  const isSame = (item: T) => item.profileId === update.profileId && item.id === update.conversationId
  const withoutCurrent = current.filter((item) => !isSame(item))

  if (update.type === 'conversation-removed' || !update.conversation) {
    return withoutCurrent
  }

  return [mapConversation(update.conversation), ...withoutCurrent]
}
