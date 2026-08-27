export {}

declare global {
  interface Window {
    unifiedChat?: {
      getVersion: () => Promise<string>
      onQuickLock: (callback: () => void) => () => void
      onQuickSwitch: (callback: (index: number) => void) => () => void
    }
  }
}
