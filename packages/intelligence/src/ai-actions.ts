export type AiAction = 'reply' | 'rewrite' | 'explain' | 'summarize' | 'translate'

export type AiTone = 'casual' | 'natural' | 'professional' | 'business'

export interface AiConversationContext {
  profileId: string
  conversationId: string
  sourceLanguage: string
  targetLanguage: string
  tone?: AiTone
  messages: Array<{
    id: string
    role: 'incoming' | 'outgoing'
    text: string
  }>
}

export interface AiActionRequest {
  action: AiAction
  input: string
  context: AiConversationContext
}

export interface AiActionResult {
  action: AiAction
  text: string
}

/**
 * Product boundary for the hidden AI action surface.
 * Providers are deliberately not exposed here: the renderer only asks for
 * an intent and conversation context, while the desktop layer chooses the
 * configured model/provider later.
 */
export interface AiActionService {
  execute(request: AiActionRequest): Promise<AiActionResult>
}

export const AI_ACTIONS: readonly AiAction[] = [
  'reply',
  'rewrite',
  'explain',
  'summarize',
  'translate',
]
