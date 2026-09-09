import React, { useState, useEffect, useRef } from 'react';
import {
  VideoMetadata,
  DownloadProgress,
  DownloadHistoryItem,
  AppSettings,
  BinaryStatus,
  DownloadRequest,
  SearchResultItem,
  PlaylistMetadata,
  ZipFileItem,
} from './types';
import { clientService, isElectron } from './services/api';
import { Navbar } from './components/Navbar';
import { UrlInput } from './components/UrlInput';
import { VideoPreview } from './components/VideoPreview';
import { SearchResults } from './components/SearchResults';
import { PlaylistView } from './components/PlaylistView';
import { DownloadQueue } from './components/DownloadQueue';
import { BatchDownloader } from './components/BatchDownloader';
import { HistoryList } from './components/HistoryList';
import { SettingsModal } from './components/SettingsModal';
import { BatchZipModal } from './components/BatchZipModal';
import { formatProperFileName } from './utils/sanitize';
import { CheckCircle2, AlertCircle, Info, Sparkles, Loader2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'search' | 'batch' | 'queue' | 'history'>('single');
  const [url, setUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [playlistMetadata, setPlaylistMetadata] = useState<PlaylistMetadata | null>(null);
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [binaryStatus, setBinaryStatus] = useState<BinaryStatus | null>(null);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUpdatingBinary, setIsUpdatingBinary] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [batchZipPrompt, setBatchZipPrompt] = useState<{
    isOpen: boolean;
    batchTitle: string;
    files: ZipFileItem[];
    outputFolder: string;
  } | null>(null);

  const activeBatchesRef = useRef<
    Map<
      string,
      {
        batchId: string;
        batchTitle: string;
        totalCount: number;
        completedFiles: ZipFileItem[];
        processedIds: Set<string>;
      }
    >
  >(new Map());

  const [settings, setSettings] = useState<AppSettings>({
    downloadFolder: isElectron ? 'Downloads/NovaDownloader' : 'Browser Downloads',
    maxConcurrentDownloads: 3,
    theme: 'dark',
    autoDetectClipboard: true,
    preferredVideoQuality: '1080p',
    preferredAudioFormat: 'mp3',
    embedThumbnailDefault: true,
    autoCheckBinaryUpdates: true,
  });

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Sync theme
  const applyTheme = (theme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', theme);
  };

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    handleSaveSettings({ theme: next });
  };

  // Initial Data Fetch
  useEffect(() => {
    clientService.getSettings().then((res) => {
      setSettings(res);
      applyTheme(res.theme || 'dark');
    });

    clientService.getHistory().then(setHistory);
    clientService.getBinaryStatus().then(setBinaryStatus);

    const unsubscribe = clientService.onDownloadProgress((prog) => {
      setDownloads((prev) => {
        const existingIndex = prev.findIndex((d) => d.id === prog.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = prog;
          return next;
        }
        return [prog, ...prev];
      });

      if (prog.status === 'completed') {
        showToast(`Downloaded: ${prog.title}`, 'success');
        clientService.getHistory().then(setHistory);
      } else if (prog.status === 'error') {
        showToast(`Failed: ${prog.error || 'Download failed'}`, 'error');
      }

      // Check if item belongs to an active batch
      if (prog.batchId && activeBatchesRef.current.has(prog.batchId)) {
        const batch = activeBatchesRef.current.get(prog.batchId)!;
        if (!batch.processedIds.has(prog.id)) {
          if (prog.status === 'completed') {
            batch.processedIds.add(prog.id);
            let ext = 'mp4';
            if (prog.filePath && prog.filePath.includes('.')) {
              ext = prog.filePath.split('.').pop() || 'mp4';
            }
            const properName = formatProperFileName(prog.itemIndex, prog.title, ext);
            if (prog.filePath) {
              batch.completedFiles.push({
                filePath: prog.filePath,
                entryName: properName,
              });
            }
          } else if (prog.status === 'error' || prog.status === 'cancelled') {
            batch.processedIds.add(prog.id);
          }

          if (batch.processedIds.size >= batch.totalCount) {
            if (batch.completedFiles.length > 0) {
              setBatchZipPrompt({
                isOpen: true,
                batchTitle: batch.batchTitle,
                files: [...batch.completedFiles],
                outputFolder: settings.downloadFolder,
              });
            }
            activeBatchesRef.current.delete(prog.batchId);
          }
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Sync Theme attribute
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Clipboard Polling (Electron)
  useEffect(() => {
    if (!settings.autoDetectClipboard || !isElectron) return;

    let lastClipboardText = '';
    const interval = setInterval(async () => {
      try {
        const text = await clientService.readClipboard();
        if (
          text &&
          text !== lastClipboardText &&
          (text.includes('youtube.com/watch') ||
            text.includes('youtu.be/') ||
            text.includes('youtube.com/shorts/') ||
            text.includes('youtube.com/playlist')) &&
          text !== url
        ) {
          lastClipboardText = text;
          setClipboardUrl(text.trim());
        }
      } catch {}
    }, 2500);

    return () => clearInterval(interval);
  }, [settings.autoDetectClipboard, url]);

  // Analyze URL or Playlist
  const handleAnalyze = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl.trim()) return;

    setIsAnalyzing(true);
    setVideoMetadata(null);
    setPlaylistMetadata(null);
    setClipboardUrl(null);

    try {
      const result = await clientService.analyzeUrl(inputUrl.trim());
      if (result.isPlaylist && result.playlist) {
        setPlaylistMetadata(result.playlist);
        showToast(`Loaded playlist: ${result.playlist.title}`, 'info');
      } else if (result.metadata) {
        setVideoMetadata(result.metadata);
        showToast(`Loaded: ${result.metadata.title}`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze link', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start Download
  const handleStartDownload = async (req: DownloadRequest) => {
    try {
      await clientService.startDownload(req);
      showToast(`Started: ${req.title}`, 'info');
      if (isElectron) {
        setActiveTab('queue');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to start download', 'error');
    }
  };

  // Enqueue Batch
  const handleEnqueueBatch = (requests: DownloadRequest[]) => {
    if (requests.length === 0) return;
    const first = requests[0];
    if (first.batchId) {
      activeBatchesRef.current.set(first.batchId, {
        batchId: first.batchId,
        batchTitle: first.batchTitle || 'Batch Download',
        totalCount: requests.length,
        completedFiles: [],
        processedIds: new Set(),
      });
    }
    for (const req of requests) {
      handleStartDownload(req);
    }
  };

  // In-App Search Video Selection
  const handleSelectSearchedVideo = (videoUrl: string) => {
    setUrl(videoUrl);
    setActiveTab('single');
    handleAnalyze(videoUrl);
  };

  // In-App Quick Download from Search
  const handleQuickDownload = (item: SearchResultItem, formatType: 'video' | 'audio') => {
    const req: DownloadRequest = {
      id: `${item.id}-${Date.now()}`,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      channel: item.uploader,
      formatType,
      quality: formatType === 'audio' ? 'mp3' : '1080p',
      audioFormat: 'mp3',
      outputPath: settings.downloadFolder,
      embedThumbnail: true,
    };
    handleStartDownload(req);
  };

  // Cancel Download
  const handleCancelDownload = async (id: string) => {
    try {
      await clientService.cancelDownload(id);
      showToast('Download cancelled', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel', 'error');
    }
  };

  // Retry Download
  const handleRetryDownload = async (id: string) => {
    try {
      const ok = await clientService.retryDownload(id);
      if (ok) {
        showToast('Retrying download...', 'info');
      } else {
        // Fallback: check if we have the request in downloads
        const dl = downloads.find((d) => d.id === id);
        if (dl) {
          handleStartDownload({
            id: dl.id,
            url: dl.url,
            title: dl.title,
            thumbnail: dl.thumbnail,
            formatType: 'video',
            quality: '1080p',
            outputPath: settings.downloadFolder,
            batchId: dl.batchId,
            batchTitle: dl.batchTitle,
            itemIndex: dl.itemIndex,
          });
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to retry', 'error');
    }
  };

  // Retry All Failed Downloads
  const handleRetryAllFailed = async () => {
    try {
      const count = await clientService.retryAllFailed();
      if (count > 0) {
        showToast(`Retrying ${count} failed item${count > 1 ? 's' : ''}...`, 'info');
      } else {
        const failedItems = downloads.filter((d) => d.status === 'error');
        for (const dl of failedItems) {
          handleRetryDownload(dl.id);
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to retry items', 'error');
    }
  };

  // Select Folder
  const handleChangeFolder = async () => {
    try {
      const folder = await clientService.selectFolder();
      if (folder) {
        const updated = await clientService.saveSettings({ downloadFolder: folder });
        setSettings(updated);
        showToast(`Download location updated`, 'success');
      }
    } catch {
      showToast('Failed to select folder', 'error');
    }
  };

  const handleOpenDownloadsFolder = async () => {
    try {
      await clientService.openFolder(settings.downloadFolder);
    } catch {
      showToast('Failed to open folder', 'error');
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await clientService.openFile(filePath);
    } catch {
      showToast('Failed to open file', 'error');
    }
  };

  // Update yt-dlp
  const handleUpdateYtDlp = async () => {
    setIsUpdatingBinary(true);
    try {
      const res = await clientService.updateYtDlp();
      if (res.success) {
        showToast(res.message, 'success');
        const status = await clientService.getBinaryStatus();
        setBinaryStatus(status);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update', 'error');
    } finally {
      setIsUpdatingBinary(false);
    }
  };

  const handleClearCompleted = () => {
    setDownloads((prev) => prev.filter((d) => d.status === 'downloading' || d.status === 'processing'));
  };

  const handleClearHistory = async () => {
    await clientService.clearHistory();
    setHistory([]);
    showToast('Download history cleared', 'info');
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await clientService.deleteHistoryItem(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSaveSettings = async (updates: Partial<AppSettings>) => {
    const updated = await clientService.saveSettings(updates);
    setSettings(updated);
    showToast('Settings saved', 'info');
  };

  const activeDownloadsCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'processing'
  ).length;

  return (
    <div className="app-container">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeDownloadsCount={activeDownloadsCount}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDownloadsFolder={handleOpenDownloadsFolder}
        binaryStatus={binaryStatus}
        isElectron={isElectron}
      />

      <main className="main-view">
        {activeTab === 'single' && (
          <>
            <UrlInput
              url={url}
              setUrl={setUrl}
              onAnalyze={handleAnalyze}
              isLoading={isAnalyzing}
              clipboardUrl={clipboardUrl}
              onUseClipboardUrl={(u) => {
                setUrl(u);
                handleAnalyze(u);
              }}
              onDismissClipboard={() => setClipboardUrl(null)}
            />

            {/* Skeleton Loading Feedback */}
            {isAnalyzing && (
              <div
                className="solid-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '30px',
                }}
              >
                <Loader2 size={24} className="spin-animation" color="var(--primary)" />
                <div>
                  <h4 style={{ fontSize: '15px', color: 'var(--text-primary)' }}>
                    Analyzing stream formats & resolutions...
                  </h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Decrypting high-speed video streams via multi-threaded engine.
                  </p>
                </div>
              </div>
            )}

            {/* Video Preview Card */}
            {videoMetadata && !isAnalyzing && (
              <VideoPreview
                metadata={videoMetadata}
                downloadFolder={settings.downloadFolder}
                onChangeFolder={handleChangeFolder}
                onStartDownload={handleStartDownload}
                isElectron={isElectron}
              />
            )}

            {/* Playlist Preview Card */}
            {playlistMetadata && !isAnalyzing && (
              <PlaylistView
                playlist={playlistMetadata}
                downloadFolder={settings.downloadFolder}
                onEnqueueBatch={(requests) => {
                  handleEnqueueBatch(requests);
                  setActiveTab('queue');
                }}
                onClose={() => setPlaylistMetadata(null)}
              />
            )}

            {!videoMetadata && !playlistMetadata && !isAnalyzing && (
              <div
                className="solid-card"
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--primary-subtle)',
                    color: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <h3 style={{ fontSize: '18px' }}>Paste Any YouTube URL or Search Above</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '440px', lineHeight: '1.6' }}>
                  Download individual videos in up to 4K 60fps, extract 320kbps MP3 audio with album art, or paste an entire playlist to download in one click.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'search' && (
          <SearchResults
            onSelectVideo={handleSelectSearchedVideo}
            onSelectPlaylist={handleSelectSearchedVideo}
            onQuickDownload={handleQuickDownload}
            onPerformSearch={(opts) => clientService.searchYouTube(opts)}
          />
        )}

        {activeTab === 'batch' && (
          <BatchDownloader
            downloadFolder={settings.downloadFolder}
            onChangeFolder={handleChangeFolder}
            onEnqueueBatch={handleEnqueueBatch}
            onSwitchToQueue={() => setActiveTab('queue')}
            isElectron={isElectron}
          />
        )}

        {activeTab === 'queue' && (
          <DownloadQueue
            downloads={downloads}
            onCancelDownload={handleCancelDownload}
            onRetryDownload={handleRetryDownload}
            onRetryAllFailed={handleRetryAllFailed}
            onClearCompleted={handleClearCompleted}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenDownloadsFolder}
            isElectron={isElectron}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            history={history}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenDownloadsFolder}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
            isElectron={isElectron}
          />
        )}
      </main>

      {/* Batch Completion ZIP Modal */}
      {batchZipPrompt && (
        <BatchZipModal
          isOpen={batchZipPrompt.isOpen}
          batchTitle={batchZipPrompt.batchTitle}
          files={batchZipPrompt.files}
          outputFolder={batchZipPrompt.outputFolder}
          onClose={() => setBatchZipPrompt(null)}
          onCreateZip={(req) => clientService.createZip(req)}
          onOpenFolder={handleOpenDownloadsFolder}
          isElectron={isElectron}
        />
      )}

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onChangeFolder={handleChangeFolder}
        binaryStatus={binaryStatus}
        onUpdateYtDlp={handleUpdateYtDlp}
        isUpdatingBinary={isUpdatingBinary}
        isElectron={isElectron}
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast-msg">
            {t.type === 'success' && <CheckCircle2 size={16} color="var(--success)" />}
            {t.type === 'error' && <AlertCircle size={16} color="var(--danger)" />}
            {t.type === 'info' && <Info size={16} color="var(--primary)" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
