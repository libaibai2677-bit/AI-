import type { BrowserWindow } from 'electron'
import type { Message } from '../../../../packages/messaging/src/types'
import { applyMessageUpdate, type IndexedConversation } from '../../../../packages/message-core/src/live-inbox'
import type { Conversation } from '../../../../packages/messaging/src/types'

export type InboxEvent = {
  type: 'conversation-updated' | 'conversation-removed'
  profileId: string
  conversationId: string
  conversation?: IndexedConversation
}

export function emitMessageToInbox(
  mainWindow: BrowserWindow | null,
  inbox: IndexedConversation[],
  conversations: Conversation[],
  message: Message,
): { inbox: IndexedConversation[]; event: InboxEvent } {
  const result = applyMessageUpdate(inbox, conversations, message)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('inbox:updated', result.update)
  }
  return { inbox: result.inbox, event: result.update }
}
