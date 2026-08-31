import { TranslationRouter, type TranslationRequest } from '../../../../packages/intelligence/src/translation-router'
import { DeepLTranslationProvider, GoogleTranslationProvider } from '../../../../packages/intelligence/src/translation-providers'
import { loadProfiles } from './profile-store'
import { getProviderSecret } from './secret-store'
import { PersistentTranslationCache } from './translation-cache-store'

export type DesktopTranslationRequest = TranslationRequest

export type DesktopTranslationResult = {
  text: string
  provider: 'deepl' | 'google'
  cached: boolean
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

/** Main-process translation boundary. Provider secrets and HTTP calls never enter the renderer. */
export async function translateText(request: DesktopTranslationRequest): Promise<DesktopTranslationResult> {
  const profiles = await loadProfiles()
  const profile = profiles.find((item) => item.id === request.profileId)
  if (!profile) throw new Error('Profile not found')

  const router = await createRouter(request.profileId)
  return router.translate(request, preferredProvider(profile.translation))
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
    const router = await createRouter(profileId)
    const translated = await router.translateBatch(group.map((item) => item.request), preferredProvider(profile.translation))
    translated.forEach((result, position) => { results[group[position].index] = result })
  }))

  return results as DesktopTranslationResult[]
}
