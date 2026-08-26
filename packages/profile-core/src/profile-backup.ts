import fs from 'node:fs/promises'
import path from 'node:path'
import type { ProfileRecord } from './profile-manager'

export interface ProfileBackupManifest {
  version: 1
  exportedAt: string
  profile: Omit<ProfileRecord, 'isolatedDataPath'>
  includesCredentials: false
}

export async function exportProfileBackup(profile: ProfileRecord, destination: string): Promise<void> {
  const manifest: ProfileBackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: { ...profile, isolatedDataPath: undefined as never },
    includesCredentials: false,
  }
  await fs.mkdir(path.dirname(destination), { recursive: true })
  await fs.writeFile(destination, JSON.stringify(manifest, null, 2), 'utf8')
}

export async function readProfileBackup(source: string): Promise<ProfileBackupManifest> {
  const raw = await fs.readFile(source, 'utf8')
  const manifest = JSON.parse(raw) as ProfileBackupManifest
  if (manifest.version !== 1 || manifest.includesCredentials !== false) {
    throw new Error('Unsupported or unsafe profile backup')
  }
  return manifest
}
