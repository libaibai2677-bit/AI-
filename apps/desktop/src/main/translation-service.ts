import { TranslationRouter, type TranslationRequest } from '../../../../packages/intelligence/src/translation-router'
import { GoogleTranslationProvider } from '../../../../packages/intelligence/src/translation-providers'
import { loadProfiles } from './profile-store'
import { getProviderSecret } from './secret-store'
import { PersistentTranslationCache } from './translation-cache-store'
import { getConversationProfile } from './conversation-profile-store'
import type { TranslationDefaults } from '../../../../packages/messaging/src/conversation-profile'

export type DesktopTranslationRequest = TranslationRequest
export type DesktopTranslationResult = { text: string; provider: 'google'; cached: boolean }

const GLOBAL_DEFAULTS: TranslationDefaults = { sourceLanguage: 'auto', targetLanguage: 'Chinese', translationEngine: 'Google', tone: 'Natural', length: 'Natural', display: 'Bilingual', aiTone: 'Casual' }

async function createRouter(profileId: string) {
  const googleKey = await getProviderSecret(profileId, 'Google')
  const providers: Partial<Record<'google', GoogleTranslationProvider>> = {}
  if (googleKey) providers.google = new GoogleTranslationProvider({ apiKey: googleKey })
  return new TranslationRouter(providers, new PersistentTranslationCache())
}

function profileDefaults(profile: Awaited<ReturnType<typeof loadProfiles>>[number]): Partial<TranslationDefaults> {
  return { targetLanguage: profile.language, translationEngine: 'Google' }
}

async function resolveRequest(request: DesktopTranslationRequest, profile: Awaited<ReturnType<typeof loadProfiles>>[number]): Promise<DesktopTranslationRequest> {
  const conversation = request.conversationId ? await getConversationProfile(request.profileId, request.conversationId) : null
  return {
    ...request,
    sourceLanguage: conversation?.sourceLanguage ?? GLOBAL_DEFAULTS.sourceLanguage,
    targetLanguage: conversation?.targetLanguage ?? profileDefaults(profile).targetLanguage ?? GLOBAL_DEFAULTS.targetLanguage,
    style: (conversation?.tone ?? GLOBAL_DEFAULTS.tone).toLowerCase() as DesktopTranslationRequest['style'],
    length: (conversation?.length ?? GLOBAL_DEFAULTS.length).toLowerCase() as DesktopTranslationRequest['length'],
  }
}

/** Main-process translation boundary. Google is the sole network translation provider. */
export async function translateText(request: DesktopTranslationRequest): Promise<DesktopTranslationResult> {
  const profiles = await loadProfiles()
  const profile = profiles.find((item) => item.id === request.profileId)
  if (!profile) throw new Error('Profile not found')
  const effective = await resolveRequest(request, profile)
  const router = await createRouter(request.profileId)
  return router.translate(effective, 'google') as Promise<DesktopTranslationResult>
}

export async function translateBatch(requests: DesktopTranslationRequest[]): Promise<DesktopTranslationResult[]> {
  if (requests.length === 0) return []
  const profiles = await loadProfiles()
  const groups = new Map<string, Array<{ index: number; request: DesktopTranslationRequest }>>()
  requests.forEach((request, index) => { const group = groups.get(request.profileId) ?? []; group.push({ index, request }); groups.set(request.profileId, group) })
  const results: Array<DesktopTranslationResult | undefined> = new Array(requests.length)
  await Promise.all([...groups.entries()].map(async ([profileId, group]) => {
    const profile = profiles.find((item) => item.id === profileId)
    if (!profile) throw new Error(`Profile not found: ${profileId}`)
    const effective = await Promise.all(group.map(item => resolveRequest(item.request, profile)))
    const router = await createRouter(profileId)
    const values = await router.translateBatch(effective, 'google')
    values.forEach((value, position) => { results[group[position].index] = value as DesktopTranslationResult })
  }))
  return results as DesktopTranslationResult[]
}