import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { TranslationCache, TranslationCacheEntry } from '../../../../packages/intelligence/src/translation-router'

type PersistedCache = Record<string, TranslationCacheEntry>

function cachePath() {
  return path.join(app.getPath('userData'), 'translation-cache.json')
}

async function load(): Promise<PersistedCache> {
  try {
    const parsed = JSON.parse(await readFile(cachePath(), 'utf8')) as PersistedCache
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function save(cache: PersistedCache) {
  await mkdir(path.dirname(cachePath()), { recursive: true })
  await writeFile(cachePath(), JSON.stringify(cache, null, 2), 'utf8')
}

/** Local-first translation cache. It survives app restarts and never stores provider credentials. */
export class PersistentTranslationCache implements TranslationCache {
  async get(key: string): Promise<TranslationCacheEntry | undefined> {
    const cache = await load()
    return cache[key]
  }

  async set(key: string, value: TranslationCacheEntry): Promise<void> {
    const cache = await load()
    cache[key] = value
    await save(cache)
  }
}
