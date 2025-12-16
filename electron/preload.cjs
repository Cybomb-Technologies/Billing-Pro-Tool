// electron/preload.cjs
// Exposes secure API to Renderer

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Branding
  getBrand: () => ipcRenderer.invoke("get-brand"),

  // Tokens
  saveTokens: (tokens) => ipcRenderer.invoke("save-tokens", tokens),
  getTokens: () => ipcRenderer.invoke("get-tokens"),
  clearTokens: () => ipcRenderer.invoke("clear-tokens"),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  // Update events
  onUpdateAvailable: (cb) => ipcRenderer.on("update-available", (_, info) => cb(info)),
  onUpdateNotAvailable: (cb) => ipcRenderer.on("update-not-available", (_, info) => cb(info)),
  onUpdateDownloaded: (cb) => ipcRenderer.on("update-downloaded", (_, info) => cb(info)),
  onUpdateProgress: (cb) => ipcRenderer.on("update-progress", (_, p) => cb(p)),
  onUpdateError: (cb) => ipcRenderer.on("update-error", (_, err) => cb(err))
});
