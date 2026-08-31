import { TranslationRouter } from '../../../../packages/intelligence/src/translation-router'
import { DeepLTranslationProvider, GoogleTranslationProvider } from '../../../../packages/intelligence/src/translation-providers'
import { loadProfiles } from './profile-store'
import { getProviderSecret } from './secret-store'
import { PersistentTranslationCache } from './translation-cache-store'

export type DesktopTranslationRequest = {
  text: string
  targetLanguage: string
  sourceLanguage?: string
  profileId: string
  conversationId?: string
  style?: 'natural' | 'casual' | 'professional'
  length?: 'natural' | 'short' | 'detailed'
}

export type DesktopTranslationResult = {
  text: string
  provider: 'deepl' | 'google'
  cached: boolean
}

/** Main-process translation boundary. Provider secrets and HTTP calls never enter the renderer. */
export async function translateText(request: DesktopTranslationRequest): Promise<DesktopTranslationResult> {
  const profiles = await loadProfiles()
  const profile = profiles.find((item) => item.id === request.profileId)
  if (!profile) throw new Error('Profile not found')

  const providers: Partial<Record<'deepl' | 'google', DeepLTranslationProvider | GoogleTranslationProvider>> = {}
  const deeplKey = await getProviderSecret(request.profileId, 'DeepL')
  const googleKey = await getProviderSecret(request.profileId, 'Google')

  if (deeplKey) providers.deepl = new DeepLTranslationProvider({ apiKey: deeplKey })
  if (googleKey) providers.google = new GoogleTranslationProvider({ apiKey: googleKey })

  const router = new TranslationRouter(providers, new PersistentTranslationCache())
  return router.translate(request, profile.translation === 'Google' ? 'google' : 'deepl')
}

export async function translateBatch(requests: DesktopTranslationRequest[]): Promise<DesktopTranslationResult[]> {
  if (requests.length === 0) return []
  return Promise.all(requests.map((request) => translateText(request)))
}
