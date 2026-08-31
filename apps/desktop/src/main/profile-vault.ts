import { app, safeStorage } from 'electron'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

type VaultRecord = {
  version: 1
  passwordSalt?: string
  passwordHash?: string
  trustedDevice?: string
}

export type VaultStatus = {
  configured: boolean
  trustedDevice: boolean
  locked: boolean
}

let record: VaultRecord | null = null
let locked = false

function vaultPath() {
  return path.join(app.getPath('userData'), 'profile-vault.json')
}

async function loadRecord(): Promise<VaultRecord> {
  if (record) return record
  try {
    record = JSON.parse(await readFile(vaultPath(), 'utf8')) as VaultRecord
  } catch {
    record = { version: 1 }
  }
  return record
}

async function saveRecord(next: VaultRecord) {
  record = next
  await writeFile(vaultPath(), JSON.stringify(next, null, 2), 'utf8')
}

function derivePasswordHash(password: string, salt: Buffer) {
  return scryptSync(password, salt, 32)
}

export async function getVaultStatus(): Promise<VaultStatus> {
  const current = await loadRecord()
  return {
    configured: Boolean(current.passwordSalt && current.passwordHash),
    trustedDevice: Boolean(current.trustedDevice),
    locked,
  }
}

export async function configureVault(password: string) {
  if (!password || password.length < 8) throw new Error('Vault password must be at least 8 characters')
  const salt = randomBytes(16)
  const hash = derivePasswordHash(password, salt)
  await saveRecord({ version: 1, passwordSalt: salt.toString('base64'), passwordHash: hash.toString('base64') })
  locked = false
  return getVaultStatus()
}

export async function unlockVault(password?: string): Promise<boolean> {
  const current = await loadRecord()
  if (!current.passwordSalt || !current.passwordHash) {
    locked = false
    return true
  }

  if (password) {
    const expected = Buffer.from(current.passwordHash, 'base64')
    const actual = derivePasswordHash(password, Buffer.from(current.passwordSalt, 'base64'))
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false
    locked = false
    return true
  }

  if (current.trustedDevice && safeStorage.isEncryptionAvailable()) {
    try {
      safeStorage.decryptString(Buffer.from(current.trustedDevice, 'base64'))
      locked = false
      return true
    } catch {
      return false
    }
  }

  return false
}

export async function enableTrustedDevice(password: string) {
  if (!(await unlockVault(password))) throw new Error('Invalid vault password')
  if (!safeStorage.isEncryptionAvailable()) throw new Error('OS secure storage is unavailable')
  const token = randomBytes(32).toString('base64url')
  const encrypted = safeStorage.encryptString(token)
  const current = await loadRecord()
  await saveRecord({ ...current, trustedDevice: encrypted.toString('base64') })
  return getVaultStatus()
}

export async function disableTrustedDevice() {
  const current = await loadRecord()
  const { trustedDevice: _trustedDevice, ...rest } = current
  await saveRecord(rest)
  return getVaultStatus()
}

export async function lockVault() {
  const current = await loadRecord()
  if (!current.passwordSalt || !current.passwordHash) return false
  locked = true
  return true
}

export async function unlockFromTrustedDevice() {
  return unlockVault()
}

export function isVaultLocked() {
  return locked
}
