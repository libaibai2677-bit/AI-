import { app } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type ProfileHealth = {
  session: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  network: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  messages: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  translation: 'connected' | 'attention' | 'disconnected' | 'not-configured'
}

export type StoredProfile = {
  id: string
  name: string
  provider: 'WhatsApp' | 'Telegram'
  status: 'connected' | 'attention' | 'disconnected' | 'not-configured'
  health: ProfileHealth
  translation: 'DeepL' | 'Google'
  language: string
  lastConversationId?: string
}

export type ProfileBackup = {
  format: 'unified-chat-profile'
  version: 1
  exportedAt: string
  profile: Pick<StoredProfile, 'id' | 'name' | 'provider' | 'translation' | 'language' | 'lastConversationId'>
}

const defaultHealth = (status: StoredProfile['status']): ProfileHealth => ({
  session: status,
  network: status,
  messages: status,
  translation: status,
})

const defaults: StoredProfile[] = [
  { id: 'personal', name: 'Personal', provider: 'WhatsApp', status: 'connected', health: defaultHealth('connected'), translation: 'DeepL', language: 'Chinese', lastConversationId: 'john' },
  { id: 'work', name: 'Work', provider: 'WhatsApp', status: 'connected', health: defaultHealth('connected'), translation: 'DeepL', language: 'Chinese', lastConversationId: 'client-a' },
  { id: 'business', name: 'Business', provider: 'WhatsApp', status: 'attention', health: { session: 'attention', network: 'connected', messages: 'attention', translation: 'connected' }, translation: 'DeepL', language: 'Chinese' },
  { id: 'telegram', name: 'Personal', provider: 'Telegram', status: 'connected', health: defaultHealth('connected'), translation: 'Google', language: 'Chinese', lastConversationId: 'david' },
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

function normalizeProfile(profile: StoredProfile): StoredProfile {
  if (profile.health) return profile
  return { ...profile, health: defaultHealth(profile.status) }
}

export async function loadProfiles(): Promise<StoredProfile[]> {
  try {
    const raw = await readFile(profilesPath(), 'utf8')
    const parsed = JSON.parse(raw) as StoredProfile[]
    if (!Array.isArray(parsed)) throw new Error('Invalid profiles state')
    const profiles = parsed.map(normalizeProfile)
    if (profiles.some((profile, index) => JSON.stringify(profile) !== JSON.stringify(parsed[index]))) {
      await saveProfiles(profiles)
    }
    return profiles
  } catch {
    await saveProfiles(defaults)
    return defaults
  }
}

export async function saveProfiles(profiles: StoredProfile[]) {
  await mkdir(path.dirname(profilesPath()), { recursive: true })
  await writeFile(profilesPath(), JSON.stringify(profiles.map(normalizeProfile), null, 2), 'utf8')
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

export async function setProfileStatus(profileId: string, status: StoredProfile['status']) {
  const profiles = await loadProfiles()
  const index = profiles.findIndex((profile) => profile.id === profileId)
  if (index < 0) throw new Error('Profile not found')

  profiles[index] = { ...profiles[index], status, health: { ...profiles[index].health, session: status } }
  await saveProfiles(profiles)
  return profiles[index]
}

export async function setProfileHealth(profileId: string, component: keyof ProfileHealth, status: ProfileHealth[typeof component]) {
  const profiles = await loadProfiles()
  const index = profiles.findIndex((profile) => profile.id === profileId)
  if (index < 0) throw new Error('Profile not found')

  const health = { ...profiles[index].health, [component]: status }
  const values = Object.values(health)
  const aggregate: StoredProfile['status'] = values.includes('attention')
    ? 'attention'
    : values.every((value) => value === 'connected')
      ? 'connected'
      : values.every((value) => value === 'not-configured')
        ? 'not-configured'
        : 'disconnected'

  profiles[index] = { ...profiles[index], health, status: aggregate }
  await saveProfiles(profiles)
  return profiles[index]
}

export async function createProfile(input: Pick<StoredProfile, 'name' | 'provider' | 'translation' | 'language'>) {
  const profiles = await loadProfiles()
  const profile: StoredProfile = {
    id: `profile-${Date.now()}`,
    ...input,
    status: 'not-configured',
    health: defaultHealth('not-configured'),
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

export async function restoreProfileConfiguration(backup: ProfileBackup) {
  if (backup.format !== 'unified-chat-profile' || backup.version !== 1) {
    throw new Error('Unsupported Profile backup format')
  }
  if (!backup.profile?.id || !backup.profile.name || !backup.profile.provider || !backup.profile.translation || !backup.profile.language) {
    throw new Error('Invalid Profile backup')
  }

  const profiles = await loadProfiles()
  const index = profiles.findIndex((profile) => profile.id === backup.profile.id)
  const existing = index >= 0 ? profiles[index] : undefined
  const restored: StoredProfile = {
    ...(existing ?? { status: 'not-configured' as const, health: defaultHealth('not-configured') }),
    id: backup.profile.id,
    name: backup.profile.name,
    provider: backup.profile.provider,
    translation: backup.profile.translation,
    language: backup.profile.language,
    lastConversationId: backup.profile.lastConversationId,
    status: existing?.status ?? 'not-configured',
    health: existing?.health ?? defaultHealth('not-configured'),
  }

  if (index >= 0) profiles[index] = restored
  else profiles.push(restored)
  await saveProfiles(profiles)
  return restored
}
