import type { BrowserWindow, WebContentsView } from 'electron'
import type { Message, Conversation } from './types'
import type { ProfileRecord } from '../../profile-core/src/profile-manager'

export interface MessagingProvider {
  readonly id: 'whatsapp' | 'telegram'
  readonly displayName: string
  readonly loginUrl: string
  createView(profile: ProfileRecord, owner: BrowserWindow): Promise<WebContentsView>
  getConversations?(profile: ProfileRecord): Promise<Conversation[]>
  getMessages?(profile: ProfileRecord, conversationId: string, cursor?: string): Promise<{ messages: Message[]; nextCursor?: string }>
}

export const providerCatalog: Record<MessagingProvider['id'], Pick<MessagingProvider, 'displayName' | 'loginUrl'>> = {
  whatsapp: {
    displayName: 'WhatsApp',
    loginUrl: 'https://web.whatsapp.com/',
  },
  telegram: {
    displayName: 'Telegram',
    loginUrl: 'https://web.telegram.org/',
  },
}
