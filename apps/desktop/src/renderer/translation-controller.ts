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

export type TranslationActionResult = {
  translatedText: string
  cached: boolean
  provider: 'deepl' | 'google' | 'memory'
}

export function createTranslationStateController() {
  let state: TranslationUiState = { status: 'idle' }
  const listeners = new Set<(state: TranslationUiState) => void>()

  const emit = () => listeners.forEach((listener) => listener(state))
  const setState = (next: TranslationUiState) => { state = next; emit() }

  return {
    getState: () => state,
    subscribe: (listener: (state: TranslationUiState) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start: (messageId: string) => setState({ status: 'translating', messageId }),
    success: (messageId: string, result: TranslationActionResult) => setState({ status: 'translated', messageId, ...result }),
    error: (messageId: string, error: unknown) => setState({ status: 'error', messageId, error: error instanceof Error ? error.message : String(error) }),
    reset: () => setState({ status: 'idle' }),
  }
}

export async function translateMessage(
  message: TranslateMessage,
  targetLanguage: string,
  profileId: string,
  updateMessage: (profileId: string, messageId: string, translatedText: string) => Promise<unknown> | unknown,
): Promise<TranslationActionResult> {
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
