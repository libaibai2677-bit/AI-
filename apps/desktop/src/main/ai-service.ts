import type { AiActionRequest, AiActionResult, AiActionService } from '../../../../packages/intelligence/src/ai-actions'

/**
 * Desktop boundary for message-level AI. A model adapter can be injected later
 * without changing the renderer contract or exposing provider credentials.
 */
export class DesktopAiActionService implements AiActionService {
  constructor(private readonly adapter?: (request: AiActionRequest) => Promise<string>) {}

  async execute(request: AiActionRequest): Promise<AiActionResult> {
    if (!request.input.trim()) throw new Error('AI action requires message text')
    if (!request.context.profileId || !request.context.conversationId) throw new Error('AI action requires conversation scope')
    if (!this.adapter) throw new Error('AI provider is not configured')
    const text = (await this.adapter(request)).trim()
    if (!text) throw new Error('AI provider returned no text')
    return { action: request.action, text }
  }
}

export const aiActionService = new DesktopAiActionService()
