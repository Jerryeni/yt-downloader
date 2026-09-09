import {
  VideoMetadata,
  SearchResultItem,
  PlaylistMetadata,
  DownloadRequest,
  AppSettings,
  DownloadHistoryItem,
  BinaryStatus,
  DownloadProgress,
} from '../types';

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

export const clientService = {
  isElectron,

  async searchYouTube(query: string): Promise<SearchResultItem[]> {
    if (isElectron) {
      return await window.electronAPI.searchYouTube(query);
    }
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Failed to search YouTube');
    const data = await res.json();
    return data.results || [];
  },

  async analyzeUrl(url: string): Promise<{ isPlaylist: boolean; metadata?: VideoMetadata; playlist?: PlaylistMetadata }> {
    if (isElectron) {
      const isPlaylist = url.includes('list=') && !url.includes('watch?v=');
      if (isPlaylist) {
        const playlist = await window.electronAPI.extractPlaylist(url);
        return { isPlaylist: true, playlist };
      }
      const metadata = await window.electronAPI.analyzeUrl(url);
      return { isPlaylist: false, metadata };
    }

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Analysis failed' }));
      throw new Error(err.error || 'Failed to analyze URL');
    }
    return await res.json();
  },

  async startDownload(req: DownloadRequest): Promise<{ success: boolean; id: string }> {
    if (isElectron) {
      return await window.electronAPI.startDownload(req);
    }

    // In Web / Mobile PWA mode: trigger browser file download stream
    const downloadUrl = `/api/download?url=${encodeURIComponent(req.url)}&type=${encodeURIComponent(req.formatType)}&quality=${encodeURIComponent(req.quality)}&title=${encodeURIComponent(req.title)}`;
    
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${req.title}.${req.formatType === 'audio' ? 'mp3' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    return { success: true, id: req.id };
  },

  async cancelDownload(id: string): Promise<boolean> {
    if (isElectron) {
      return await window.electronAPI.cancelDownload(id);
    }
    return true;
  },

  async selectFolder(): Promise<string | null> {
    if (isElectron) {
      return await window.electronAPI.selectFolder();
    }
    return null;
  },

  async openFolder(folderPath?: string): Promise<boolean> {
    if (isElectron) {
      return await window.electronAPI.openFolder(folderPath);
    }
    return false;
  },

  async openFile(filePath: string): Promise<boolean> {
    if (isElectron) {
      return await window.electronAPI.openFile(filePath);
    }
    window.open(filePath, '_blank');
    return true;
  },

  async getSettings(): Promise<AppSettings> {
    if (isElectron) {
      return await window.electronAPI.getSettings();
    }
    // Local storage fallback for web
    const saved = localStorage.getItem('novadl_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      downloadFolder: 'Browser Downloads',
      maxConcurrentDownloads: 3,
      theme: 'dark',
      autoDetectClipboard: true,
      preferredVideoQuality: '1080p',
      preferredAudioFormat: 'mp3',
      embedThumbnailDefault: true,
      autoCheckBinaryUpdates: true,
    };
  },

  async saveSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
    if (isElectron) {
      return await window.electronAPI.saveSettings(updates);
    }
    const current = await this.getSettings();
    const updated = { ...current, ...updates };
    localStorage.setItem('novadl_settings', JSON.stringify(updated));
    return updated;
  },

  async getHistory(): Promise<DownloadHistoryItem[]> {
    if (isElectron) {
      return await window.electronAPI.getHistory();
    }
    const saved = localStorage.getItem('novadl_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  },

  async clearHistory(): Promise<boolean> {
    if (isElectron) {
      return await window.electronAPI.clearHistory();
    }
    localStorage.removeItem('novadl_history');
    return true;
  },

  async deleteHistoryItem(id: string): Promise<boolean> {
    if (isElectron) {
      return await window.electronAPI.deleteHistoryItem(id);
    }
    const history = await this.getHistory();
    const filtered = history.filter((h) => h.id !== id);
    localStorage.setItem('novadl_history', JSON.stringify(filtered));
    return true;
  },

  async getBinaryStatus(): Promise<BinaryStatus> {
    if (isElectron) {
      return await window.electronAPI.getBinaryStatus();
    }
    return {
      ytdlp: { available: true, version: 'Web Server Engine' },
      ffmpeg: { available: true, version: 'Server Transcoder' },
    };
  },

  async updateYtDlp(): Promise<{ success: boolean; message: string; version?: string }> {
    if (isElectron) {
      return await window.electronAPI.updateYtDlp();
    }
    return { success: true, message: 'Server engine is managed remotely' };
  },

  async readClipboard(): Promise<string> {
    if (isElectron) {
      return await window.electronAPI.readClipboard();
    }
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {}
    return '';
  },

  onDownloadProgress(callback: (progress: DownloadProgress) => void): () => void {
    if (isElectron) {
      return window.electronAPI.onDownloadProgress(callback);
    }
    return () => {};
  },
};
