export type Platform = 'whatsapp' | 'telegram'
export type MessageDirection = 'incoming' | 'outgoing'

export interface Message {
  id: string
  conversationId: string
  profileId: string
  platform: Platform
  text: string
  direction: MessageDirection
  createdAt: string
  translatedText?: string
  isMention?: boolean
}

export interface Conversation {
  id: string
  title: string
  platform: Platform
  participantId: string
}
