import { app } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import type { CreateProfileInput, Profile, ProfileStatus } from './types'

export interface ProfileRecord extends Profile {
  isolatedDataPath: string
}

export class ProfileManager {
  private readonly rootPath: string
  private readonly profilesPath: string
  private readonly records = new Map<string, ProfileRecord>()

  constructor(rootPath = path.join(app.getPath('userData'), 'profiles')) {
    this.rootPath = rootPath
    this.profilesPath = path.join(rootPath, 'index.json')
  }

  async init(): Promise<void> {
    await fs.mkdir(this.rootPath, { recursive: true })
    try {
      const raw = await fs.readFile(this.profilesPath, 'utf8')
      const records = JSON.parse(raw) as ProfileRecord[]
      for (const record of records) this.records.set(record.id, record)
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined
      if (code !== 'ENOENT') throw error
      await this.persist()
    }
  }

  list(): ProfileRecord[] {
    return [...this.records.values()]
  }

  get(id: string): ProfileRecord | undefined {
    return this.records.get(id)
  }

  async create(input: CreateProfileInput): Promise<ProfileRecord> {
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const isolatedDataPath = path.join(this.rootPath, id, 'browser-data')
    const record: ProfileRecord = {
      id,
      name: input.name,
      provider: input.provider,
      status: 'not-configured',
      isolatedDataPath,
      language: input.language ?? 'zh-CN',
      translation: {
        provider: 'deepl',
        targetLanguage: input.language ?? 'zh-CN',
        tone: 'natural',
        length: 'natural',
        bilingual: true,
        ...input.translation,
      },
      ai: {
        enabled: false,
        tone: 'neutral',
        ...input.ai,
      },
      createdAt: now,
      updatedAt: now,
    }

    await fs.mkdir(isolatedDataPath, { recursive: true })
    this.records.set(id, record)
    await this.persist()
    return record
  }

  async update(id: string, patch: Partial<Pick<Profile, 'name' | 'status' | 'language' | 'translation' | 'ai' | 'lastConversationId'>>): Promise<ProfileRecord> {
    const record = this.require(id)
    const updated: ProfileRecord = {
      ...record,
      ...patch,
      translation: patch.translation ? { ...record.translation, ...patch.translation } : record.translation,
      ai: patch.ai ? { ...record.ai, ...patch.ai } : record.ai,
      updatedAt: new Date().toISOString(),
    }
    this.records.set(id, updated)
    await this.persist()
    return updated
  }

  async updateStatus(id: string, status: ProfileStatus): Promise<ProfileRecord> {
    return this.update(id, { status })
  }

  async remove(id: string): Promise<void> {
    const record = this.require(id)
    this.records.delete(id)
    await fs.rm(path.dirname(record.isolatedDataPath), { recursive: true, force: true })
    await this.persist()
  }

  private require(id: string): ProfileRecord {
    const record = this.records.get(id)
    if (!record) throw new Error(`Profile not found: ${id}`)
    return record
  }

  private async persist(): Promise<void> {
    const temporaryPath = `${this.profilesPath}.tmp`
    await fs.writeFile(temporaryPath, JSON.stringify(this.list(), null, 2), 'utf8')
    await fs.rename(temporaryPath, this.profilesPath)
  }
}
