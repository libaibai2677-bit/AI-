import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StoredDictionaryEntry = {
  source: string
  target: string
  note?: string
}

type DictionaryState = Record<string, StoredDictionaryEntry[]>

function dictionaryPath() {
  return path.join(app.getPath('userData'), 'translation-memory.json')
}

async function loadState(): Promise<DictionaryState> {
  try {
    const raw = await readFile(dictionaryPath(), 'utf8')
    const parsed = JSON.parse(raw) as DictionaryState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function saveState(state: DictionaryState) {
  await mkdir(path.dirname(dictionaryPath()), { recursive: true })
  await writeFile(dictionaryPath(), JSON.stringify(state, null, 2), 'utf8')
}

export async function listDictionary(profileId: string): Promise<StoredDictionaryEntry[]> {
  const state = await loadState()
  return state[profileId] ?? []
}

export async function setDictionaryEntry(profileId: string, entry: StoredDictionaryEntry) {
  const source = entry.source.trim()
  const target = entry.target.trim()
  if (!source || !target) throw new Error('Dictionary source and target are required')

  const state = await loadState()
  const entries = state[profileId] ?? []
  const index = entries.findIndex((item) => item.source.trim().toLocaleLowerCase() === source.toLocaleLowerCase())
  const next = { source, target, ...(entry.note?.trim() ? { note: entry.note.trim() } : {}) }
  if (index >= 0) entries[index] = next
  else entries.push(next)
  state[profileId] = entries
  await saveState(state)
  return next
}

export async function removeDictionaryEntry(profileId: string, source: string) {
  const state = await loadState()
  const entries = state[profileId] ?? []
  state[profileId] = entries.filter((item) => item.source.trim().toLocaleLowerCase() !== source.trim().toLocaleLowerCase())
  await saveState(state)
}

export async function clearDictionary(profileId: string) {
  const state = await loadState()
  delete state[profileId]
  await saveState(state)
}

/** Applies longer profile-specific terms first so a specific phrase wins over a shorter term. */
export function applyDictionaryEntries(text: string, entries: StoredDictionaryEntry[]) {
  return entries
    .filter((entry) => entry.source.trim() && entry.target.trim())
    .sort((a, b) => b.source.length - a.source.length)
    .reduce((result, entry) => result.replaceAll(entry.source, entry.target), text)
}
