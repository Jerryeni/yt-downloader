export interface VideoFormat {
  formatId: string;
  formatNote?: string;
  resolution?: string;
  ext: string;
  filesize?: number;
  filesizeFormatted?: string;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  isAudioOnly: boolean;
  isVideoOnly: boolean;
  qualityRank: number;
}

export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  uploader: string;
  uploaderUrl?: string;
  channel?: string;
  duration: number;
  durationFormatted: string;
  viewCount: number;
  uploadDate?: string;
  thumbnail: string;
  description?: string;
  videoFormats: VideoFormat[];
  audioFormats: VideoFormat[];
  subtitles: Array<{ lang: string; name: string }>;
}

export interface SearchResultItem {
  id: string;
  url: string;
  title: string;
  uploader: string;
  durationFormatted: string;
  thumbnail: string;
  viewCount?: number;
}

export interface PlaylistItem {
  id: string;
  url: string;
  title: string;
  durationFormatted: string;
  thumbnail: string;
  index: number;
}

export interface PlaylistMetadata {
  id: string;
  title: string;
  uploader: string;
  itemCount: number;
  items: PlaylistItem[];
}

export interface DownloadRequest {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  channel?: string;
  formatType: 'video' | 'audio';
  quality: string; // 'best', '4k', '1440p', '1080p', '720p', '480p', 'mp3-320k', 'mp3-192k', 'm4a', 'flac', 'wav'
  formatId?: string;
  audioFormat?: 'mp3' | 'm4a' | 'flac' | 'wav';
  outputPath: string;
  embedSubtitles?: boolean;
  subtitleLang?: string;
  embedThumbnail?: boolean;
}

export type DownloadStatus = 'queued' | 'downloading' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface DownloadProgress {
  id: string;
  url: string;
  title: string;
  thumbnail: string;
  percent: number;
  speed: string;
  eta: string;
  downloadedBytes: string;
  totalBytes: string;
  status: DownloadStatus;
  filePath?: string;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

export interface DownloadHistoryItem {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  completedAt: number;
  filePath: string;
  fileSize: string;
  formatType: 'video' | 'audio';
  quality: string;
}

export interface AppSettings {
  downloadFolder: string;
  maxConcurrentDownloads: number;
  theme: 'light' | 'dark';
  autoDetectClipboard: boolean;
  preferredVideoQuality: string;
  preferredAudioFormat: string;
  embedThumbnailDefault: boolean;
  autoCheckBinaryUpdates: boolean;
}

export interface BinaryStatus {
  ytdlp: {
    available: boolean;
    version?: string;
    path?: string;
  };
  ffmpeg: {
    available: boolean;
    version?: string;
    path?: string;
  };
}

export interface ElectronAPI {
  analyzeUrl: (url: string) => Promise<VideoMetadata>;
  searchYouTube: (query: string) => Promise<SearchResultItem[]>;
  extractPlaylist: (url: string) => Promise<PlaylistMetadata>;
  startDownload: (request: DownloadRequest) => Promise<{ success: boolean; id: string }>;
  cancelDownload: (id: string) => Promise<boolean>;
  selectFolder: () => Promise<string | null>;
  openFolder: (folderPath?: string) => Promise<boolean>;
  openFile: (filePath: string) => Promise<boolean>;
  getSettings: () => Promise<AppSettings>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<AppSettings>;
  getHistory: () => Promise<DownloadHistoryItem[]>;
  clearHistory: () => Promise<boolean>;
  deleteHistoryItem: (id: string) => Promise<boolean>;
  getBinaryStatus: () => Promise<BinaryStatus>;
  updateYtDlp: () => Promise<{ success: boolean; message: string; version?: string }>;
  onDownloadProgress: (callback: (progress: DownloadProgress) => void) => () => void;
  readClipboard: () => Promise<string>;
}
