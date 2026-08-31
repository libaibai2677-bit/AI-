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

type AppState = {
  activeProfileId?: string
}

function profilesPath() {
  return path.join(app.getPath('userData'), 'profiles.json')
}

function statePath() {
  return path.join(app.getPath('userData'), 'app-state.json')
}

export async function loadProfiles(): Promise<StoredProfile[]> {
  try {
    const raw = await readFile(profilesPath(), 'utf8')
    return JSON.parse(raw) as StoredProfile[]
  } catch {
    await saveProfiles(defaults)
    return defaults
  }
}

export async function saveProfiles(profiles: StoredProfile[]) {
  await mkdir(path.dirname(profilesPath()), { recursive: true })
  await writeFile(profilesPath(), JSON.stringify(profiles, null, 2), 'utf8')
}

export async function loadActiveProfileId(): Promise<string | null> {
  try {
    const raw = await readFile(statePath(), 'utf8')
    const state = JSON.parse(raw) as AppState
    return state.activeProfileId ?? null
  } catch {
    return null
  }
}

export async function setActiveProfileId(profileId: string) {
  const profiles = await loadProfiles()
  if (!profiles.some((profile) => profile.id === profileId)) throw new Error('Profile not found')

  let state: AppState = {}
  try {
    state = JSON.parse(await readFile(statePath(), 'utf8')) as AppState
  } catch {
    // First run: create the state file below.
  }

  state.activeProfileId = profileId
  await mkdir(path.dirname(statePath()), { recursive: true })
  await writeFile(statePath(), JSON.stringify(state, null, 2), 'utf8')
  return profileId
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
