// electron/main.cjs
// CommonJS version — SAFE for projects with "type": "module"

const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

const fs = require("fs");
const isDev = !app.isPackaged;
const keytar = require("keytar");
const { autoUpdater } = require("electron-updater");

// ----- Branding Loader -----
function loadBrandJson() {
  try {
    const resourcesPath = isDev 
      ? path.join(__dirname, "..", "public") 
      : path.join(__dirname, "..", "dist");
    const brandPath = path.join(resourcesPath, "activeBrand", "brand.json");
    if (fs.existsSync(brandPath)) {
      return JSON.parse(fs.readFileSync(brandPath, "utf8"));
    }
  } catch (err) {
    console.error("Error loading brand.json:", err);
  }
  return {};
}

// ----- Window -----
let mainWindow;

function createWindow() {
  const brand = loadBrandJson();

  const resourcesPath = isDev 
    ? path.join(__dirname, "..", "public") 
    : path.join(__dirname, "..", "dist");

  const iconPath = path.join(resourcesPath, "activeBrand", brand.iconPath || "icon.png");

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    icon: fs.existsSync(iconPath) ? iconPath : path.join(resourcesPath, "logo.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    // In production, load the local index.html.
    // Since main.cjs is in 'electron/', we need to go up one level to find 'dist/'.
    const indexPath = path.join(__dirname, "..", "dist", "index.html");
    mainWindow.loadFile(indexPath);
  }
}

// ----- IPC: Branding -----
ipcMain.handle("get-brand", async () => {
  return loadBrandJson();
});

// ----- IPC: Keytar Token Storage -----
const SERVICE = "BillingApp";

ipcMain.handle("save-tokens", async (event, tokens) => {
  try {
    if (tokens.accessToken) await keytar.setPassword(SERVICE, "accessToken", tokens.accessToken);
    if (tokens.refreshToken) await keytar.setPassword(SERVICE, "refreshToken", tokens.refreshToken);
    if (tokens.customerId) await keytar.setPassword(SERVICE, "customerId", tokens.customerId);
    return { ok: true };
  } catch (e) {
    console.error("save-tokens error:", e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("get-tokens", async () => {
  try {
    const accessToken = await keytar.getPassword(SERVICE, "accessToken");
    const refreshToken = await keytar.getPassword(SERVICE, "refreshToken");
    const customerId = await keytar.getPassword(SERVICE, "customerId");
    return { ok: true, accessToken, refreshToken, customerId };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("clear-tokens", async () => {
  try {
    await keytar.deletePassword(SERVICE, "accessToken");
    await keytar.deletePassword(SERVICE, "refreshToken");
    await keytar.deletePassword(SERVICE, "customerId");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// ----- Auto Updates -----
autoUpdater.autoDownload = true;

ipcMain.handle("check-for-updates", () => {
  const brand = loadBrandJson();
  const feedURL = brand.updateUrl || process.env.UPDATE_URL;
  if (feedURL) {
    try {
      autoUpdater.setFeedURL({ provider: "generic", url: feedURL });
    } catch (err) {
      console.warn("Failed to set feed URL:", err);
    }
  }
  autoUpdater.checkForUpdates();
});

ipcMain.handle("quit-and-install", () => {
  autoUpdater.quitAndInstall();
});

// Forward update events to Renderer
autoUpdater.on("update-available", (info) => {
  mainWindow.webContents.send("update-available", info);
});
autoUpdater.on("update-not-available", (info) => {
  mainWindow.webContents.send("update-not-available", info);
});
autoUpdater.on("download-progress", (p) => {
  mainWindow.webContents.send("update-progress", p);
});
autoUpdater.on("update-downloaded", (info) => {
  mainWindow.webContents.send("update-downloaded", info);
});
autoUpdater.on("error", (err) => {
  mainWindow.webContents.send("update-error", err.message);
});

// ----- App Events -----
app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
