import { session } from 'electron'
import fs from 'node:fs/promises'
import type { ProfileRecord } from './profile-manager'

export interface ProfileRuntime {
  profileId: string
  partition: string
  ready: boolean
}

/**
 * Creates a persistent Electron session partition for one Profile.
 * The partition name is derived only from the local Profile ID and is never
 * shared with another Profile.
 */
export async function prepareProfileRuntime(profile: ProfileRecord): Promise<ProfileRuntime> {
  await fs.mkdir(profile.isolatedDataPath, { recursive: true })
  const partition = `persist:unified-chat-${profile.id}`
  const profileSession = session.fromPartition(partition)
  await profileSession.flushStorageData()
  return { profileId: profile.id, partition, ready: true }
}
