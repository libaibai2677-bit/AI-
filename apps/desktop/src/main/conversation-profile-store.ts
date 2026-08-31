import { app } from 'electron'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import type { ConversationProfile } from '../../../../packages/messaging/src/conversation-profile'

const filePath = () => path.join(app.getPath('userData'), 'conversation-profiles.json')

type Store = Record<string, ConversationProfile>

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await readFile(filePath(), 'utf8')) as Store
  } catch {
    return {}
  }
}

async function writeStore(store: Store): Promise<void> {
  await mkdir(path.dirname(filePath()), { recursive: true })
  await writeFile(filePath(), JSON.stringify(store, null, 2), 'utf8')
}

function key(profileId: string, conversationId: string): string {
  return `${profileId}:${conversationId}`
}

export async function getConversationProfile(profileId: string, conversationId: string): Promise<ConversationProfile | null> {
  const store = await readStore()
  return store[key(profileId, conversationId)] ?? null
}

export async function listConversationProfiles(profileId: string): Promise<ConversationProfile[]> {
  const store = await readStore()
  return Object.values(store).filter(item => item.profileId === profileId)
}

export async function setConversationProfile(profile: ConversationProfile): Promise<ConversationProfile> {
  const store = await readStore()
  store[key(profile.profileId, profile.conversationId)] = profile
  await writeStore(store)
  return profile
}

export async function removeConversationProfile(profileId: string, conversationId: string): Promise<void> {
  const store = await readStore()
  delete store[key(profileId, conversationId)]
  await writeStore(store)
}
