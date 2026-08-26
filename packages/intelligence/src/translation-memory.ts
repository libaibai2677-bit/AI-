export interface DictionaryEntry {
  source: string
  target: string
  note?: string
}

export class TranslationMemory {
  private readonly entries = new Map<string, Map<string, DictionaryEntry>>()

  set(profileId: string, entry: DictionaryEntry): void {
    const profileEntries = this.entries.get(profileId) ?? new Map<string, DictionaryEntry>()
    profileEntries.set(entry.source.trim().toLocaleLowerCase(), entry)
    this.entries.set(profileId, profileEntries)
  }

  get(profileId: string, source: string): DictionaryEntry | undefined {
    return this.entries.get(profileId)?.get(source.trim().toLocaleLowerCase())
  }

  list(profileId: string): DictionaryEntry[] {
    return [...(this.entries.get(profileId)?.values() ?? [])]
  }

  clear(profileId: string): void {
    this.entries.delete(profileId)
  }
}

/** Applies exact profile-specific dictionary terms before an external translation call. */
export function applyDictionary(text: string, memory: TranslationMemory, profileId: string): string {
  let result = text
  for (const entry of memory.list(profileId).sort((a, b) => b.source.length - a.source.length)) {
    result = result.replaceAll(entry.source, entry.target)
  }
  return result
}
