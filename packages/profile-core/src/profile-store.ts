import type { CreateProfileInput, Profile, TranslationSettings, AiSettings } from './types'

const defaultTranslation: TranslationSettings = {
  provider: 'deepl',
  targetLanguage: 'zh-CN',
  tone: 'natural',
  length: 'natural',
  bilingual: true,
}

const defaultAi: AiSettings = {
  enabled: false,
  tone: 'neutral',
}

function makeId() {
  return crypto.randomUUID()
}

export class ProfileStore {
  private profiles = new Map<string, Profile>()

  create(input: CreateProfileInput): Profile {
    const now = new Date().toISOString()
    const id = makeId()
    const profile: Profile = {
      id,
      name: input.name,
      provider: input.provider,
      status: 'not-configured',
      isolatedDataPath: `profiles/${id}/browser-data`,
      language: input.language ?? 'zh-CN',
      translation: { ...defaultTranslation, ...input.translation },
      ai: { ...defaultAi, ...input.ai },
      createdAt: now,
      updatedAt: now,
    }
    this.profiles.set(id, profile)
    return profile
  }

  list(): Profile[] {
    return [...this.profiles.values()]
  }

  get(id: string): Profile | undefined {
    return this.profiles.get(id)
  }

  update(id: string, patch: Partial<Omit<Profile, 'id' | 'createdAt'>>): Profile {
    const current = this.profiles.get(id)
    if (!current) throw new Error(`Profile not found: ${id}`)

    const updated: Profile = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    }
    this.profiles.set(id, updated)
    return updated
  }

  remove(id: string): void {
    this.profiles.delete(id)
  }
}
