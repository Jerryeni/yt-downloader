import { contextBridge, ipcRenderer } from 'electron';
import {
  DownloadRequest,
  AppSettings,
  DownloadProgress,
  ElectronAPI,
} from '../shared/types';

const api: ElectronAPI = {
  analyzeUrl: (url: string) => ipcRenderer.invoke('analyze-url', url),
  startDownload: (request: DownloadRequest) => ipcRenderer.invoke('start-download', request),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (folderPath?: string) => ipcRenderer.invoke('open-folder', folderPath),
  openFile: (filePath: string) => ipcRenderer.invoke('open-file', filePath),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Partial<AppSettings>) => ipcRenderer.invoke('save-settings', settings),
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  deleteHistoryItem: (id: string) => ipcRenderer.invoke('delete-history-item', id),
  getBinaryStatus: () => ipcRenderer.invoke('get-binary-status'),
  updateYtDlp: () => ipcRenderer.invoke('update-ytdlp'),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const handler = (_event: any, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
