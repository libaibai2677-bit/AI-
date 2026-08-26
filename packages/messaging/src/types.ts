export type MessagePlatform = 'whatsapp' | 'telegram'

export interface Participant {
  id: string
  displayName: string
}

export interface Message {
  id: string
  profileId: string
  conversationId: string
  platform: MessagePlatform
  sender: Participant
  text: string
  translatedText?: string
  timestamp: string
  unread: boolean
  mentioned: boolean
  favorite: boolean
  followUp: boolean
}

export interface Conversation {
  id: string
  profileId: string
  platform: MessagePlatform
  title: string
  participant?: Participant
  lastMessage?: Message
  unreadCount: number
}
