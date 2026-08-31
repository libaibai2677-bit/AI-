import type { Message } from '../../messaging/src/types'
import type { TranslationRequest, TranslationResult } from '../../intelligence/src/translation-router'

export type TranslationBatchOptions = {
  debounceMs?: number
  maxMessages?: number
}

export type MessageTranslation = {
  messageId: string
  originalText: string
  translatedText: string
  provider: TranslationResult['provider']
  cached: boolean
}

export type TranslationBatch = {
  profileId: string
  conversationId: string
  messages: Message[]
  combinedText: string
}

const DEFAULT_DEBOUNCE_MS = 350
const DEFAULT_MAX_MESSAGES = 8

/**
 * Collects consecutive incoming messages from the same conversation before the
 * translation boundary is called. It deliberately keeps message order intact.
 */
export function createTranslationBatch(
  messages: Message[],
  options: TranslationBatchOptions = {},
): TranslationBatch | null {
  if (messages.length === 0) return null

  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES
  const selected = messages.slice(0, maxMessages)
  const first = selected[0]

  if (selected.some(message => message.profileId !== first.profileId || message.conversationId !== first.conversationId)) {
    throw new Error('Translation batch must contain one Profile and one conversation')
  }

  return {
    profileId: first.profileId,
    conversationId: first.conversationId,
    messages: selected,
    combinedText: selected.map(message => message.text).join('\n'),
  }
}

/** Creates provider requests for one message at a time while sharing the same batch boundary. */
export function toTranslationRequests(
  batch: TranslationBatch,
  targetLanguage: string,
  style: TranslationRequest['style'] = 'natural',
  length: TranslationRequest['length'] = 'natural',
): TranslationRequest[] {
  return batch.messages.map(message => ({
    text: message.text,
    targetLanguage,
    profileId: batch.profileId,
    conversationId: batch.conversationId,
    style,
    length,
  }))
}

/** Applies translated results back to the normalized messages without changing originals. */
export function applyTranslationResults(
  messages: Message[],
  translations: MessageTranslation[],
): Message[] {
  const byId = new Map(translations.map(item => [item.messageId, item]))
  return messages.map(message => {
    const translation = byId.get(message.id)
    return translation ? { ...message, translatedText: translation.translatedText } : message
  })
}

/**
 * Builds the UI-friendly bilingual representation. The original message is
 * always preserved, so hiding translation never destroys source content.
 */
export function toBilingualMessages(messages: Message[]): Array<Pick<Message, 'id' | 'text' | 'translatedText' | 'sender' | 'timestamp'>> {
  return messages.map(message => ({
    id: message.id,
    text: message.text,
    translatedText: message.translatedText,
    sender: message.sender,
    timestamp: message.timestamp,
  }))
}

export function translationDebounceMs(options: TranslationBatchOptions = {}): number {
  return Math.max(0, options.debounceMs ?? DEFAULT_DEBOUNCE_MS)
}
