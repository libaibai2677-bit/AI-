import type { BrowserWindow } from 'electron'
import { loadProfiles } from './profile-store'
import { getProfileWebContents } from './profile-window'
import { syncOpenProfile } from './provider-runtime-sync'

const DEFAULT_INTERVAL_MS = 2500

export class ProviderSyncLoop {
  private timer: NodeJS.Timeout | null = null
  private running = false
  private readonly inFlight = new Set<string>()

  constructor(
    private readonly mainWindow: () => BrowserWindow | null,
    private readonly intervalMs = DEFAULT_INTERVAL_MS,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => { void this.tick() }, this.intervalMs)
    void this.tick()
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  }

  private async tick(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      const profiles = await loadProfiles()
      await Promise.all(profiles.map(async profile => {
        if (this.inFlight.has(profile.id)) return
        const webContents = getProfileWebContents(profile.id)
        if (!webContents || webContents.isDestroyed()) return

        this.inFlight.add(profile.id)
        try {
          const result = await syncOpenProfile(profile.id)
          if (result) {
            this.mainWindow()?.webContents.send('messages:profile-synced', result)
          }
        } finally {
          this.inFlight.delete(profile.id)
        }
      }))
    } finally {
      this.running = false
    }
  }
}
