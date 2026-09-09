import { app, BrowserWindow, ipcMain, dialog, shell, clipboard } from 'electron';
import path from 'path';
import { BinaryManager } from './binaryManager';
import { DownloadEngine } from './downloader';
import { AppStore } from './store';
import { DownloadRequest, AppSettings } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
const binaryManager = new BinaryManager();
const store = new AppStore();
const downloadEngine = new DownloadEngine(binaryManager, store);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1140,
    height: 800,
    minWidth: 920,
    minHeight: 640,
    backgroundColor: '#0a0d14',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Forward download progress to renderer
  downloadEngine.on('progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download-progress', progress);
    }
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    createWindow();

    // Auto-check binary in background
    setTimeout(async () => {
      try {
        await binaryManager.getYtDlpPath();
      } catch (err) {
        console.error('Initial binary check error:', err);
      }
    }, 1500);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Register IPC Handlers
ipcMain.handle('analyze-url', async (_event, url: string) => {
  try {
    return await downloadEngine.extractMetadata(url);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to analyze URL');
  }
});

ipcMain.handle('search-youtube', async (_event, query: string) => {
  try {
    return await downloadEngine.searchVideos(query);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to search YouTube');
  }
});

ipcMain.handle('extract-playlist', async (_event, url: string) => {
  try {
    return await downloadEngine.extractPlaylist(url);
  } catch (error: any) {
    throw new Error(error.message || 'Failed to extract playlist');
  }
});

ipcMain.handle('start-download', async (_event, request: DownloadRequest) => {
  try {
    // Run asynchronously, progress is streamed via event
    downloadEngine.startDownload(request).catch((err) => {
      console.error('Download error:', err);
    });
    return { success: true, id: request.id };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to start download');
  }
});

ipcMain.handle('cancel-download', async (_event, id: string) => {
  return downloadEngine.cancelDownload(id);
});

ipcMain.handle('select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Download Folder',
  });
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

ipcMain.handle('open-folder', async (_event, folderPath?: string) => {
  const target = folderPath || store.getSettings().downloadFolder;
  await shell.openPath(target);
  return true;
});

ipcMain.handle('open-file', async (_event, filePath: string) => {
  if (filePath) {
    await shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('get-settings', async () => {
  return store.getSettings();
});

ipcMain.handle('save-settings', async (_event, settings: Partial<AppSettings>) => {
  return store.saveSettings(settings);
});

ipcMain.handle('get-history', async () => {
  return store.getHistory();
});

ipcMain.handle('clear-history', async () => {
  store.clearHistory();
  return true;
});

ipcMain.handle('delete-history-item', async (_event, id: string) => {
  store.deleteHistoryItem(id);
  return true;
});

ipcMain.handle('get-binary-status', async () => {
  return await binaryManager.getStatus();
});

ipcMain.handle('update-ytdlp', async () => {
  return await binaryManager.updateYtDlp();
});

ipcMain.handle('read-clipboard', async () => {
  return clipboard.readText();
});
