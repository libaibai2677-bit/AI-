import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('unifiedChat', {
  getVersion: () => ipcRenderer.invoke('app:version') as Promise<string>,
  backupProfile: (payload: unknown) => ipcRenderer.invoke('profile:backup', payload) as Promise<{ canceled: boolean; path?: string }>,
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
