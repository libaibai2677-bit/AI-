import type { Message, Provider } from './index'

export type ProviderConversation = {
  id: string
  profileId: string
  platform: Provider
  title: string
  participant?: {
    id?: string
    displayName?: string
  }
  unreadCount: number
  favorite: boolean
  mentionCount: number
  followUp: boolean
  updatedAt: string
  lastMessage?: Message
}

export type ProviderSnapshot = {
  profileId: string
  provider: Provider
  status: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  conversations: ProviderConversation[]
}

export interface MessagingProvider {
  readonly provider: Provider
  connect(profileId: string): Promise<void>
  disconnect(profileId: string): Promise<void>
  getSnapshot(profileId: string): Promise<ProviderSnapshot>
  openConversation(profileId: string, conversationId: string): Promise<void>
  sendMessage(profileId: string, conversationId: string, text: string): Promise<Message>
}

export class MessagingProviderRegistry {
  private readonly providers = new Map<Provider, MessagingProvider>()

  register(provider: MessagingProvider) {
    this.providers.set(provider.provider, provider)
    return this
  }

  get(provider: Provider) {
    return this.providers.get(provider)
  }

  require(provider: Provider) {
    const adapter = this.get(provider)
    if (!adapter) throw new Error(`Messaging provider not registered: ${provider}`)
    return adapter
  }

  list() {
    return [...this.providers.values()]
  }
}
