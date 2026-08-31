import { app, BrowserWindow, dialog, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const isDevelopment = !app.isPackaged;
let mainWindow = null;
let localServer = null;
let appUrl = null;

function preparePersistentStorage() {
  const nexobookHome = path.join(app.getPath('documents'), 'Nexobook');
  const storageRoot = process.env.NEXOBOOK_DATA_DIR || path.join(nexobookHome, 'storage');

  // During the first desktop development run, carry the current local data into
  // the persistent Electron location. Packaged builds never bundle personal data.
  if (!fs.existsSync(storageRoot) && isDevelopment) {
    const existingStorage = path.join(projectRoot, 'storage');
    if (fs.existsSync(existingStorage)) {
      fs.mkdirSync(path.dirname(storageRoot), { recursive: true });
      fs.cpSync(existingStorage, storageRoot, { recursive: true });
    }
  }

  fs.mkdirSync(storageRoot, { recursive: true });
  process.env.NEXOBOOK_DATA_DIR = storageRoot;
  return storageRoot;
}

async function startLocalServer() {
  preparePersistentStorage();
  if (!isDevelopment) process.env.NEXOBOOK_RENDERER_DIR = path.join(app.getAppPath(), 'dist');

  // Import only after defining NEXOBOOK_DATA_DIR because storage paths are
  // intentionally resolved once when the backend modules are loaded.
  const serverModuleUrl = pathToFileURL(path.join(projectRoot, 'server', 'index.js')).href;
  const { startServer } = await import(serverModuleUrl);
  const preferredPort = isDevelopment ? Number(process.env.NEXOBOOK_DESKTOP_PORT) || 3211 : 0;
  const started = await startServer({ port: preferredPort, host: '127.0.0.1' });
  localServer = started.server;
  appUrl = isDevelopment ? process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5180' : started.url;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'Nexobook',
    width: 1440,
    height: 920,
    minWidth: 1040,
    minHeight: 700,
    backgroundColor: '#0d0d0d',
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.loadURL(appUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) app.quit();

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  try {
    await startLocalServer();
    createWindow();
  } catch (error) {
    console.error('[Nexobook Desktop]', error);
    dialog.showErrorBox('Nexobook no pudo iniciarse', `${error.message}\n\nTus datos no fueron modificados.`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && appUrl) createWindow();
  });
});

app.on('before-quit', () => {
  if (localServer) localServer.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
