import { useEffect, useRef } from 'react'

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

type Options<T extends ConversationLike> = {
  onUpdate: (update: InboxUpdate, current: T[]) => T[]
  onEmpty?: () => void
}

/**
 * Subscribes a renderer surface to incremental Unified Inbox events.
 * The controller owns no data itself; the React state remains the source
 * of truth and onUpdate decides how an event is projected into that state.
 */
export function useLiveInbox<T extends ConversationLike>(
  options: Options<T>,
): React.MutableRefObject<T[] | null> {
  const stateRef = useRef<T[] | null>(null)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const cleanup = window.unifiedChat?.onInboxUpdate((update) => {
      const current = stateRef.current ?? []
      const next = optionsRef.current.onUpdate(update, current)
      stateRef.current = next
      if (next.length === 0) optionsRef.current.onEmpty?.()
    })

    return () => cleanup?.()
  }, [])

  return stateRef
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
