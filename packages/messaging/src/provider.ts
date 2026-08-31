import type { BrowserWindow, WebContentsView } from 'electron'
import type { Conversation, Message, MessagePlatform } from './types'
import type { ProviderSnapshot } from './sync'
import type { ProfileRecord } from '../../profile-core/src/profile-manager'

export type ProviderConnectionStatus = 'connected' | 'attention' | 'disconnected' | 'not-configured'

export interface ProviderContext {
  profileId: string
  platform: MessagePlatform
}

/**
 * Platform boundary for the Message Layer.
 *
 * The shell may render a provider view, but normalized conversations/messages
 * and lifecycle operations stay behind this adapter so adding another
 * messaging platform does not require rewriting the application core.
 */
export interface MessagingProvider {
  readonly id: MessagePlatform
  readonly displayName: string
  readonly loginUrl: string

  createView(profile: ProfileRecord, owner: BrowserWindow): Promise<WebContentsView>
  getConversations?(profile: ProfileRecord): Promise<Conversation[]>
  getMessages?(profile: ProfileRecord, conversationId: string, cursor?: string): Promise<{ messages: Message[]; nextCursor?: string }>

  connect?(context: ProviderContext): Promise<void>
  disconnect?(context: ProviderContext): Promise<void>
  getStatus?(context: ProviderContext): Promise<ProviderConnectionStatus>
  sync?(context: ProviderContext): Promise<ProviderSnapshot>
  openConversation?(context: ProviderContext, conversationId: string): Promise<void>
  sendMessage?(context: ProviderContext, conversationId: string, text: string): Promise<void>
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

export class MessagingProviderRegistry {
  private readonly providers = new Map<MessagePlatform, MessagingProvider>()

  register(provider: MessagingProvider): void {
    this.providers.set(provider.id, provider)
  }

  get(platform: MessagePlatform): MessagingProvider | undefined {
    return this.providers.get(platform)
  }

  list(): MessagingProvider[] {
    return [...this.providers.values()]
  }
}
