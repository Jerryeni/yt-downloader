import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { AppSettings, DownloadHistoryItem } from '../shared/types';

const defaultSettings: AppSettings = {
  downloadFolder: path.join(app.getPath('downloads'), 'NovaDownloader'),
  maxConcurrentDownloads: 3,
  theme: 'dark',
  autoDetectClipboard: true,
  preferredVideoQuality: '1080p',
  preferredAudioFormat: 'mp3',
  embedThumbnailDefault: true,
  autoCheckBinaryUpdates: true,
};

export class AppStore {
  private settingsPath: string;
  private historyPath: string;
  private settings: AppSettings;
  private history: DownloadHistoryItem[] = [];

  constructor() {
    const userData = app.getPath('userData');
    this.settingsPath = path.join(userData, 'settings.json');
    this.historyPath = path.join(userData, 'history.json');

    this.settings = this.loadSettings();
    this.history = this.loadHistory();

    // Ensure the download directory is absolute, present and writable. A saved
    // relative path would resolve against the process CWD (the install folder
    // under C:\Program Files on Windows) and fail with EPERM.
    if (!path.isAbsolute(this.settings.downloadFolder || '')) {
      this.settings.downloadFolder = defaultSettings.downloadFolder;
    }

    try {
      fs.mkdirSync(this.settings.downloadFolder, { recursive: true });
      fs.accessSync(this.settings.downloadFolder, fs.constants.W_OK);
    } catch {
      this.settings.downloadFolder = app.getPath('downloads');
      try {
        fs.mkdirSync(this.settings.downloadFolder, { recursive: true });
      } catch {
        // The OS Downloads folder always exists; nothing further to do.
      }
    }
  }

  private loadSettings(): AppSettings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return { ...defaultSettings, ...JSON.parse(data) };
      }
    } catch (e) {
      console.error('Failed to load settings, using defaults', e);
    }
    return defaultSettings;
  }

  public getSettings(): AppSettings {
    return this.settings;
  }

  public saveSettings(updates: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...updates };
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save settings', e);
    }
    return this.settings;
  }

  private loadHistory(): DownloadHistoryItem[] {
    try {
      if (fs.existsSync(this.historyPath)) {
        const data = fs.readFileSync(this.historyPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
    return [];
  }

  public getHistory(): DownloadHistoryItem[] {
    return this.history;
  }

  public addHistoryItem(item: DownloadHistoryItem): void {
    // Keep most recent first, max 200 items
    this.history = [item, ...this.history.filter((h) => h.id !== item.id)].slice(0, 200);
    this.saveHistory();
  }

  public deleteHistoryItem(id: string): void {
    this.history = this.history.filter((h) => h.id !== id);
    this.saveHistory();
  }

  public clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }

  private saveHistory(): void {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save history', e);
    }
  }
}
