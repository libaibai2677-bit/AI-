import { contextBridge, ipcRenderer } from 'electron'

type CreateProfileInput = {
  name: string
  provider: 'whatsapp' | 'telegram'
  language?: string
  translation?: Record<string, unknown>
  ai?: Record<string, unknown>
}

contextBridge.exposeInMainWorld('unifiedChat', {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  listProfiles: () => ipcRenderer.invoke('profiles:list'),
  getActiveProfile: () => ipcRenderer.invoke('profiles:get-active') as Promise<string | null>,
  setActiveProfile: (profileId: string) => ipcRenderer.invoke('profiles:set-active', profileId),
  createProfile: (input: CreateProfileInput) => ipcRenderer.invoke('profiles:create', input),
  openProfile: (profileId: string) => ipcRenderer.invoke('profiles:open', profileId),
  updateProfile: (profileId: string, patch: Record<string, unknown>) => ipcRenderer.invoke('profiles:update', profileId, patch),
  onQuickLock: (callback: () => void) => {
    const listener = () => callback()
    ipcRenderer.on('profile:quick-lock', listener)
    return () => ipcRenderer.removeListener('profile:quick-lock', listener)
  },
  onQuickSwitch: (callback: (index: number) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, index: number) => callback(index)
    ipcRenderer.on('profile:quick-switch', listener)
    return () => ipcRenderer.removeListener('profile:quick-switch', listener)
  },
})
