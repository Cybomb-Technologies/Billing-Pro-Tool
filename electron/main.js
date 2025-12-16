// electron/main.js
// Main process for Electron app.
// Features:
// - Loads React app (dev: localhost:3000, prod: frontend/build/index.html)
// - Loads brand JSON from public/activeBrand/brand.json
// - Keytar-based token storage via IPC
// - Basic auto-update wiring via electron-updater
// - Exposes IPC handlers for: get-brand, save-tokens, get-tokens, clear-tokens, check-updates, quit-and-install

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const keytar = require('keytar');
const { autoUpdater } = require('electron-updater');

const APP_KEYTAR_SERVICE = process.env.KEYTAR_SERVICE_NAME || 'BillingPro';
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const CUSTOMER_ID_KEY = 'customerId';

// read brand file if exists
function loadBrandJson() {
  try {
    const brandPath = path.join(__dirname, '..', 'public', 'activeBrand', 'brand.json');
    if (fs.existsSync(brandPath)) {
      const raw = fs.readFileSync(brandPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading brand.json', err);
  }
  return null;
}

let mainWindow;
async function createWindow() {
  const brand = loadBrandJson();
  const iconPath = brand && brand.iconPath
    ? path.join(__dirname, '..', 'public', 'activeBrand', brand.iconPath)
    : path.join(__dirname, '..', 'public', 'activeBrand', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    icon: fs.existsSync(iconPath) ? iconPath : undefined
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    // dev: load CRA/Vite dev server
    const url = process.env.ELECTRON_START_URL || 'http://localhost:3000';
    mainWindow.loadURL(url).catch(err => console.error('Failed to load URL', err));
    // optionally open devtools in dev
    // mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(__dirname, '..', 'frontend', 'build', 'index.html');
    mainWindow.loadFile(indexPath).catch(err => console.error('Failed to load file', err));
  }
}

// ---------------- IPC handlers ----------------

// Return brand.json (if available) so renderer can theme itself
ipcMain.handle('get-brand', async () => {
  return loadBrandJson() || {};
});

// Save tokens securely (store in OS keychain)
ipcMain.handle('save-tokens', async (event, { accessToken, refreshToken, customerId }) => {
  try {
    if (accessToken) await keytar.setPassword(APP_KEYTAR_SERVICE, ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) await keytar.setPassword(APP_KEYTAR_SERVICE, REFRESH_TOKEN_KEY, refreshToken);
    if (customerId) await keytar.setPassword(APP_KEYTAR_SERVICE, CUSTOMER_ID_KEY, customerId);
    return { ok: true };
  } catch (err) {
    console.error('save-tokens error', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('get-tokens', async () => {
  try {
    const accessToken = await keytar.getPassword(APP_KEYTAR_SERVICE, ACCESS_TOKEN_KEY);
    const refreshToken = await keytar.getPassword(APP_KEYTAR_SERVICE, REFRESH_TOKEN_KEY);
    const customerId = await keytar.getPassword(APP_KEYTAR_SERVICE, CUSTOMER_ID_KEY);
    return { ok: true, accessToken, refreshToken, customerId };
  } catch (err) {
    console.error('get-tokens error', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('clear-tokens', async () => {
  try {
    await keytar.deletePassword(APP_KEYTAR_SERVICE, ACCESS_TOKEN_KEY);
    await keytar.deletePassword(APP_KEYTAR_SERVICE, REFRESH_TOKEN_KEY);
    await keytar.deletePassword(APP_KEYTAR_SERVICE, CUSTOMER_ID_KEY);
    return { ok: true };
  } catch (err) {
    console.error('clear-tokens error', err);
    return { ok: false, error: String(err) };
  }
});

// Allow renderer to ask main to check for updates immediately
ipcMain.handle('check-for-updates', async () => {
  try {
    // If you want per-brand update URL, either set process.env.UPDATE_URL at build-time
    // or put it inside brand.json with key "updateUrl" and autoUpdater.setFeedURL accordingly.
    const brand = loadBrandJson();
    const feedUrl = process.env.UPDATE_URL || (brand && brand.updateUrl) || null;
    if (feedUrl) {
      try {
        autoUpdater.setFeedURL({ provider: 'generic', url: feedUrl });
      } catch (e) {
        console.warn('Failed to set feed URL', e);
      }
    }
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    console.error('check-for-updates error', err);
    return { ok: false, error: String(err) };
  }
});

// Allow renderer to instruct main to quit and install (after update downloaded)
ipcMain.handle('quit-and-install', async () => {
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (err) {
    console.error('quit-and-install error', err);
    return { ok: false, error: String(err) };
  }
});

// ---------------- Auto-updater events ----------------
autoUpdater.autoDownload = true;

autoUpdater.on('error', (err) => {
  console.error('autoUpdater error', err);
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-error', String(err));
  }
});

autoUpdater.on('checking-for-update', () => {
  mainWindow?.webContents?.send('update-checking');
});

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents?.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  mainWindow?.webContents?.send('update-not-available', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents?.send('update-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents?.send('update-downloaded', info);
  // optionally prompt user here via dialog, but renderer will get event and can ask user
  // Example immediate install:
  // autoUpdater.quitAndInstall();
});

// ---------------- App lifecycle ----------------
app.on('ready', async () => {
  try {
    await createWindow();
    // If you want to check for updates on startup (after license validated in renderer),
    // you can call autoUpdater.checkForUpdates() here as well, but be mindful of network
    // and license flow ordering.
  } catch (err) {
    console.error('Failed to create main window', err);
  }
});

app.on('window-all-closed', () => {
  // Respect macOS typical behavior
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Optional: gracefully handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception', err);
  // we don't crash the app here — optionally report to Sentry
});
