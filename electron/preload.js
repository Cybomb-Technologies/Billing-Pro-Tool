// electron/preload.js
// Exposes a minimal, safe API to renderer using contextBridge.
// Methods correspond to handlers implemented in main.js

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Branding
  getBrand: async () => {
    // returns brand object (or empty object) from main
    return await ipcRenderer.invoke('get-brand');
  },

  // Token storage (keytar in main)
  saveTokens: async (tokens) => {
    // tokens: { accessToken, refreshToken, customerId }
    return await ipcRenderer.invoke('save-tokens', tokens);
  },
  getTokens: async () => {
    return await ipcRenderer.invoke('get-tokens');
  },
  clearTokens: async () => {
    return await ipcRenderer.invoke('clear-tokens');
  },

  // Auto-update controls
  checkForUpdates: async () => {
    return await ipcRenderer.invoke('check-for-updates');
  },
  quitAndInstall: async () => {
    return await ipcRenderer.invoke('quit-and-install');
  },

  // Event subscriptions from main (update lifecycle, errors)
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', (event, info) => callback(info));
  },
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, progress) => callback(progress));
  },
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', () => callback());
  },
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', (event, info) => callback(info));
  }
});
