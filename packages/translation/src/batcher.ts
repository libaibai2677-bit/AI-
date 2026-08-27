export interface BatchMessage {
  id: string
  text: string
}

export interface MessageBatcherOptions {
  windowMs?: number
  maxMessages?: number
}

/**
 * Collects consecutive incoming messages for one conversation before the
 * translation layer is called. This prevents one API request per message.
 */
export class MessageBatcher {
  private readonly windowMs: number
  private readonly maxMessages: number
  private timer: ReturnType<typeof setTimeout> | undefined
  private pending: BatchMessage[] = []

  constructor(
    private readonly flush: (messages: BatchMessage[]) => void | Promise<void>,
    options: MessageBatcherOptions = {},
  ) {
    this.windowMs = options.windowMs ?? 350
    this.maxMessages = options.maxMessages ?? 8
  }

  push(message: BatchMessage): void {
    this.pending.push(message)

    if (this.pending.length >= this.maxMessages) {
      void this.flushNow()
      return
    }

    if (this.timer) clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.flushNow(), this.windowMs)
  }

  async flushNow(): Promise<void> {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined

    if (this.pending.length === 0) return
    const batch = this.pending
    this.pending = []
    await this.flush(batch)
  }
}
