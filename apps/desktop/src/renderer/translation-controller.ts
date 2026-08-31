export type TranslateMessage = {
  id: string
  profileId: string
  conversationId: string
  text: string
  translatedText?: string
  timestamp: string
}

export type TranslationUiState =
  | { status: 'idle' }
  | { status: 'translating'; messageId: string }
  | { status: 'translated'; messageId: string; cached: boolean; provider: 'deepl' | 'google' | 'memory' }
  | { status: 'error'; messageId: string; error: string }

export async function translateMessage(
  message: TranslateMessage,
  targetLanguage: string,
  profileId: string,
  updateMessage: (profileId: string, messageId: string, translatedText: string) => Promise<unknown> | unknown,
): Promise<{ translatedText: string; cached: boolean; provider: 'deepl' | 'google' | 'memory' }> {
  if (message.translatedText?.trim()) {
    return { translatedText: message.translatedText, cached: true, provider: 'memory' }
  }

  const result = await window.unifiedChat?.translate({
    text: message.text,
    targetLanguage,
    profileId,
    conversationId: message.conversationId,
  })

  if (!result?.text?.trim()) throw new Error('Translation returned no text')

  await updateMessage(profileId, message.id, result.text)
  return { translatedText: result.text, cached: result.cached, provider: result.provider }
}
