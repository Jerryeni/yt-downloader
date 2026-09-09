import { contextBridge, ipcRenderer } from 'electron';
import {
  DownloadRequest,
  AppSettings,
  DownloadProgress,
  ElectronAPI,
  BinaryStatus,
  SearchFilterOptions,
  CreateZipRequest,
} from '../shared/types';

const api: ElectronAPI = {
  analyzeUrl: (url: string) => ipcRenderer.invoke('analyze-url', url),
  searchYouTube: (options: SearchFilterOptions) => ipcRenderer.invoke('search-youtube', options),
  extractPlaylist: (url: string) => ipcRenderer.invoke('extract-playlist', url),
  startDownload: (request: DownloadRequest) => ipcRenderer.invoke('start-download', request),
  cancelDownload: (id: string) => ipcRenderer.invoke('cancel-download', id),
  retryDownload: (id: string) => ipcRenderer.invoke('retry-download', id),
  retryAllFailed: () => ipcRenderer.invoke('retry-all-failed'),
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
  installFfmpeg: () => ipcRenderer.invoke('install-ffmpeg'),
  readClipboard: () => ipcRenderer.invoke('read-clipboard'),
  createZip: (request: CreateZipRequest) => ipcRenderer.invoke('create-zip', request),
  onBinaryStatus: (callback: (status: BinaryStatus) => void) => {
    const handler = (_event: any, status: BinaryStatus) => callback(status);
    ipcRenderer.on('binary-status', handler);
    return () => {
      ipcRenderer.removeListener('binary-status', handler);
    };
  },
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => {
    const handler = (_event: any, progress: DownloadProgress) => callback(progress);
    ipcRenderer.on('download-progress', handler);
    return () => {
      ipcRenderer.removeListener('download-progress', handler);
    };
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
