import { safeStorage } from 'electron'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

type StoredSecrets = Record<string, string>

function secretsPath() {
  return path.join(app.getPath('userData'), 'secrets.json')
}

async function loadSecrets(): Promise<StoredSecrets> {
  try {
    return JSON.parse(await readFile(secretsPath(), 'utf8')) as StoredSecrets
  } catch {
    return {}
  }
}

async function saveSecrets(secrets: StoredSecrets) {
  await mkdir(path.dirname(secretsPath()), { recursive: true })
  await writeFile(secretsPath(), JSON.stringify(secrets, null, 2), 'utf8')
}

function assertAvailable() {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS-backed encryption is not available on this device')
  }
}

export async function setProviderSecret(profileId: string, provider: 'DeepL' | 'Google', value: string) {
  assertAvailable()
  if (!value.trim()) throw new Error('Secret value cannot be empty')

  const secrets = await loadSecrets()
  const key = `${profileId}:${provider}`
  secrets[key] = safeStorage.encryptString(value).toString('base64')
  await saveSecrets(secrets)
}

export async function getProviderSecret(profileId: string, provider: 'DeepL' | 'Google'): Promise<string | null> {
  assertAvailable()
  const secrets = await loadSecrets()
  const encoded = secrets[`${profileId}:${provider}`]
  if (!encoded) return null

  try {
    return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
  } catch {
    throw new Error('Stored provider secret could not be decrypted')
  }
}

export async function hasProviderSecret(profileId: string, provider: 'DeepL' | 'Google'): Promise<boolean> {
  const secrets = await loadSecrets()
  return Boolean(secrets[`${profileId}:${provider}`])
}

export async function removeProviderSecret(profileId: string, provider: 'DeepL' | 'Google') {
  const secrets = await loadSecrets()
  delete secrets[`${profileId}:${provider}`]
  await saveSecrets(secrets)
}
