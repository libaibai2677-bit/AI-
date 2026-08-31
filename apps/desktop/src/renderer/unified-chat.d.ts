export {}

declare global {
  interface Window {
    unifiedChat?: {
      getVersion: () => Promise<string>
      backupProfile: (payload: unknown) => Promise<{ canceled: boolean; path?: string }>
      onQuickLock: (callback: () => void) => () => void
      onQuickSwitch: (callback: (index: number) => void) => () => void
    }
  }
}
