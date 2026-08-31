import { TranslationRouter, type TranslationRequest } from '../../../../packages/intelligence/src/translation-router'
import { DeepLTranslationProvider, GoogleTranslationProvider } from '../../../../packages/intelligence/src/translation-providers'
import { loadProfiles } from './profile-store'
import { getProviderSecret } from './secret-store'
import { PersistentTranslationCache } from './translation-cache-store'
import { getConversationProfile } from './conversation-profile-store'
import type { TranslationDefaults } from '../../../../packages/messaging/src/conversation-profile'

export type DesktopTranslationRequest = TranslationRequest

export type DesktopTranslationResult = {
  text: string
  provider: 'deepl' | 'google'
  cached: boolean
}

const GLOBAL_DEFAULTS: TranslationDefaults = {
  sourceLanguage: 'auto',
  targetLanguage: 'Chinese',
  translationEngine: 'DeepL',
  tone: 'Natural',
  length: 'Natural',
  display: 'Bilingual',
  aiTone: 'Casual',
}

async function createRouter(profileId: string) {
  const deeplKey = await getProviderSecret(profileId, 'DeepL')
  const googleKey = await getProviderSecret(profileId, 'Google')
  const providers: Partial<Record<'deepl' | 'google', DeepLTranslationProvider | GoogleTranslationProvider>> = {}

  if (deeplKey) providers.deepl = new DeepLTranslationProvider({ apiKey: deeplKey })
  if (googleKey) providers.google = new GoogleTranslationProvider({ apiKey: googleKey })

  return new TranslationRouter(providers, new PersistentTranslationCache())
}

function preferredProvider(translation: 'DeepL' | 'Google'): 'deepl' | 'google' {
  return translation === 'Google' ? 'google' : 'deepl'
}

function profileDefaults(profile: Awaited<ReturnType<typeof loadProfiles>>[number]): Partial<TranslationDefaults> {
  return {
    targetLanguage: profile.language,
    translationEngine: profile.translation,
  }
}

async function resolveRequest(request: DesktopTranslationRequest, profile: Awaited<ReturnType<typeof loadProfiles>>[number]): Promise<DesktopTranslationRequest> {
  const conversation = request.conversationId
    ? await getConversationProfile(request.profileId, request.conversationId)
    : null

  const resolved = {
    sourceLanguage: conversation?.sourceLanguage ?? GLOBAL_DEFAULTS.sourceLanguage,
    targetLanguage: conversation?.targetLanguage ?? profileDefaults(profile).targetLanguage ?? GLOBAL_DEFAULTS.targetLanguage,
    style: (conversation?.tone ?? profileDefaults(profile).tone ?? GLOBAL_DEFAULTS.tone).toLowerCase() as DesktopTranslationRequest['style'],
    length: (conversation?.length ?? profileDefaults(profile).length ?? GLOBAL_DEFAULTS.length).toLowerCase() as DesktopTranslationRequest['length'],
  }

  return { ...request, ...resolved }
}

/** Main-process translation boundary. Provider secrets and HTTP calls never enter the renderer. */
export async function translateText(request: DesktopTranslationRequest): Promise<DesktopTranslationResult> {
  const profiles = await loadProfiles()
  const profile = profiles.find((item) => item.id === request.profileId)
  if (!profile) throw new Error('Profile not found')

  const effective = await resolveRequest(request, profile)
  const conversation = effective.conversationId ? await getConversationProfile(effective.profileId, effective.conversationId) : null
  const engine = conversation?.translationEngine ?? profile.translation
  const router = await createRouter(request.profileId)
  return router.translate(effective, preferredProvider(engine))
}

/** Groups requests by Profile so one isolated Profile can use one provider-native batch. */
export async function translateBatch(requests: DesktopTranslationRequest[]): Promise<DesktopTranslationResult[]> {
  if (requests.length === 0) return []

  const profiles = await loadProfiles()
  const groups = new Map<string, Array<{ index: number; request: DesktopTranslationRequest }>>()
  requests.forEach((request, index) => {
    const group = groups.get(request.profileId) ?? []
    group.push({ index, request })
    groups.set(request.profileId, group)
  })

  const results: Array<DesktopTranslationResult | undefined> = new Array(requests.length)
  await Promise.all([...groups.entries()].map(async ([profileId, group]) => {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error(`Profile not found: ${profileId}`)

    const effective = await Promise.all(group.map(item => resolveRequest(item.request, profile)))
    const translated = await (async () => {
      // A batch is kept provider-consistent per Profile. Conversation-level engine
      // overrides are split into separate batches so specificity is never lost.
      const byEngine = new Map<'deepl' | 'google', Array<{ position: number; request: DesktopTranslationRequest }>>()
      for (let position = 0; position < effective.length; position += 1) {
        const request = effective[position]
        const conversation = request.conversationId ? await getConversationProfile(request.profileId, request.conversationId) : null
        const engine = preferredProvider(conversation?.translationEngine ?? profile.translation)
        const bucket = byEngine.get(engine) ?? []
        bucket.push({ position, request })
        byEngine.set(engine, bucket)
      }

      const output: Array<DesktopTranslationResult | undefined> = new Array(effective.length)
      await Promise.all([...byEngine.entries()].map(async ([engine, bucket]) => {
        const router = await createRouter(profileId)
        const values = await router.translateBatch(bucket.map(item => item.request), engine)
        values.forEach((value, i) => { output[bucket[i].position] = value })
      }))
      return output as DesktopTranslationResult[]
    })()

    translated.forEach((result, position) => { results[group[position].index] = result })
  }))

  return results as DesktopTranslationResult[]
}
