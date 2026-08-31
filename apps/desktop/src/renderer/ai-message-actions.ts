import type { AiAction, AiActionResult, AiConversationContext } from '../../../../packages/intelligence/src/ai-actions'

export type AiActionUiState =
  | { status: 'idle' }
  | { status: 'running'; action: AiAction; messageId: string }
  | { status: 'success'; action: AiAction; messageId: string; result: AiActionResult }
  | { status: 'error'; action: AiAction; messageId: string; error: string }

export type AiActionExecutor = (request: {
  action: AiAction
  input: string
  context: AiConversationContext
}) => Promise<AiActionResult>

export function createAiMessageActionController(execute: AiActionExecutor) {
  let state: AiActionUiState = { status: 'idle' }
  const listeners = new Set<(state: AiActionUiState) => void>()
  const emit = () => listeners.forEach((listener) => listener(state))

  return {
    getState: () => state,
    subscribe: (listener: (state: AiActionUiState) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async run(action: AiAction, messageId: string, input: string, context: AiConversationContext) {
      state = { status: 'running', action, messageId }
      emit()
      try {
        const result = await execute({ action, input, context })
        state = { status: 'success', action, messageId, result }
        emit()
        return result
      } catch (error) {
        state = { status: 'error', action, messageId, error: error instanceof Error ? error.message : String(error) }
        emit()
        throw error
      }
    },
    reset: () => { state = { status: 'idle' }; emit() },
  }
}

export function buildMessageAiContext(
  profileId: string,
  conversationId: string,
  sourceLanguage: string,
  targetLanguage: string,
  messages: Array<{ id: string; role: 'incoming' | 'outgoing'; text: string }>,
  tone?: AiConversationContext['tone'],
): AiConversationContext {
  return { profileId, conversationId, sourceLanguage, targetLanguage, tone, messages }
}
