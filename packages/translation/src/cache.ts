export interface TranslationCacheEntry {
  text: string
  provider: 'deepl' | 'google'
  createdAt: number
}

/**
 * Local-first translation cache. The cache key is scoped to profile and
 * conversation so one workspace never leaks terminology into another.
 * Persistence is intentionally injected later by the Local Data Layer.
 */
export class TranslationCache {
  private readonly entries = new Map<string, TranslationCacheEntry>()

  get(key: string): TranslationCacheEntry | undefined {
    return this.entries.get(key)
  }

  set(key: string, entry: TranslationCacheEntry): void {
    this.entries.set(key, entry)
  }

  clear(): void {
    this.entries.clear()
  }

  size(): number {
    return this.entries.size
  }
}
