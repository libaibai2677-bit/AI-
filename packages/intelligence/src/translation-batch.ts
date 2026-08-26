export interface PendingMessage {
  id: string
  text: string
  conversationId: string
  receivedAt: number
}

export interface TranslationBatch {
  conversationId: string
  messages: PendingMessage[]
  text: string
}

export interface BatchOptions {
  debounceMs?: number
  maxMessages?: number
}

/**
 * Groups rapid consecutive incoming messages from the same conversation.
 * This is transport-agnostic: the Message Layer decides how to submit the
 * resulting text to Translation Router.
 */
export class TranslationBatcher {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly pending = new Map<string, PendingMessage[]>()
  private readonly options: Required<BatchOptions>

  constructor(
    private readonly onBatch: (batch: TranslationBatch) => void,
    options: BatchOptions = {},
  ) {
    this.options = {
      debounceMs: options.debounceMs ?? 700,
      maxMessages: options.maxMessages ?? 8,
    }
  }

  push(message: PendingMessage): void {
    const queue = this.pending.get(message.conversationId) ?? []
    queue.push(message)
    this.pending.set(message.conversationId, queue.slice(-this.options.maxMessages))

    const existingTimer = this.timers.get(message.conversationId)
    if (existingTimer) clearTimeout(existingTimer)

    if (queue.length >= this.options.maxMessages) {
      this.flush(message.conversationId)
      return
    }

    this.timers.set(
      message.conversationId,
      setTimeout(() => this.flush(message.conversationId), this.options.debounceMs),
    )
  }

  flush(conversationId: string): void {
    const timer = this.timers.get(conversationId)
    if (timer) clearTimeout(timer)
    this.timers.delete(conversationId)

    const messages = this.pending.get(conversationId)
    if (!messages?.length) return

    this.pending.delete(conversationId)
    this.onBatch({
      conversationId,
      messages,
      text: messages.map((message) => message.text).join('\n'),
    })
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
    this.pending.clear()
  }
}
