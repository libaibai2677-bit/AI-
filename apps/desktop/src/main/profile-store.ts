import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type StoredProfile = {
  id: string
  name: string
  provider: 'WhatsApp' | 'Telegram'
  status: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  translation: 'DeepL' | 'Google'
  language: string
  lastConversationId?: string
}

const defaults: StoredProfile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', translation: 'DeepL', language: 'Chinese', lastConversationId: 'john' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', translation: 'DeepL', language: 'Chinese', lastConversationId: 'client-a' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', translation: 'DeepL', language: 'Chinese' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', translation: 'Google', language: 'Chinese', lastConversationId: 'david' },
]

function filePath() {
  return path.join(app.getPath('userData'), 'profiles.json')
}

export async function loadProfiles(): Promise<StoredProfile[]> {
  try {
    const raw = await readFile(filePath(), 'utf8')
    return JSON.parse(raw) as StoredProfile[]
  } catch {
    await saveProfiles(defaults)
    return defaults
  }
}

export async function saveProfiles(profiles: StoredProfile[]) {
  await mkdir(path.dirname(filePath()), { recursive: true })
  await writeFile(filePath(), JSON.stringify(profiles, null, 2), 'utf8')
}

export async function createProfile(input: Pick<StoredProfile, 'name' | 'provider' | 'translation' | 'language'>) {
  const profiles = await loadProfiles()
  const profile: StoredProfile = {
    id: `profile-${Date.now()}`,
    ...input,
    status: 'not-configured',
  }
  profiles.push(profile)
  await saveProfiles(profiles)
  return profile
}

export async function setLastConversation(profileId: string, conversationId: string) {
  const profiles = await loadProfiles()
  const index = profiles.findIndex((profile) => profile.id === profileId)
  if (index < 0) throw new Error('Profile not found')

  profiles[index] = { ...profiles[index], lastConversationId: conversationId }
  await saveProfiles(profiles)
  return profiles[index]
}
