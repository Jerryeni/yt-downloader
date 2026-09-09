import React, { useState, useEffect } from 'react';
import {
  VideoMetadata,
  DownloadProgress,
  DownloadHistoryItem,
  AppSettings,
  BinaryStatus,
  DownloadRequest,
} from './types';
import { Navbar } from './components/Navbar';
import { UrlInput } from './components/UrlInput';
import { VideoPreview } from './components/VideoPreview';
import { DownloadQueue } from './components/DownloadQueue';
import { BatchDownloader } from './components/BatchDownloader';
import { HistoryList } from './components/HistoryList';
import { SettingsModal } from './components/SettingsModal';
import { CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch' | 'queue' | 'history'>('single');
  const [url, setUrl] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [binaryStatus, setBinaryStatus] = useState<BinaryStatus | null>(null);
  const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isUpdatingBinary, setIsUpdatingBinary] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [settings, setSettings] = useState<AppSettings>({
    downloadFolder: 'Downloads/NovaDownloader',
    maxConcurrentDownloads: 3,
    theme: 'cosmic',
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

  // Initial Data Fetch
  useEffect(() => {
    if (!window.electronAPI) return;

    window.electronAPI.getSettings().then((res) => {
      setSettings(res);
      document.documentElement.setAttribute('data-theme', res.theme || 'cosmic');
    });

    window.electronAPI.getHistory().then((res) => {
      setHistory(res);
    });

    window.electronAPI.getBinaryStatus().then((res) => {
      setBinaryStatus(res);
    });

    // Listen to real-time download progress
    const unsubscribe = window.electronAPI.onDownloadProgress((prog) => {
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
        showToast(`Download finished: ${prog.title}`, 'success');
        // Refresh history
        window.electronAPI.getHistory().then(setHistory);
      } else if (prog.status === 'error') {
        showToast(`Download failed: ${prog.error || 'Unknown error'}`, 'error');
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Theme Sync
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  // Clipboard Polling
  useEffect(() => {
    if (!settings.autoDetectClipboard || !window.electronAPI) return;

    let lastClipboardText = '';

    const interval = setInterval(async () => {
      try {
        const text = await window.electronAPI.readClipboard();
        if (
          text &&
          text !== lastClipboardText &&
          (text.includes('youtube.com/watch') ||
            text.includes('youtu.be/') ||
            text.includes('youtube.com/shorts/')) &&
          text !== url
        ) {
          lastClipboardText = text;
          setClipboardUrl(text.trim());
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [settings.autoDetectClipboard, url]);

  // Analyze URL Action
  const handleAnalyze = async (targetUrl?: string) => {
    const inputUrl = targetUrl || url;
    if (!inputUrl.trim()) return;

    setIsAnalyzing(true);
    setVideoMetadata(null);
    setClipboardUrl(null);

    try {
      const meta = await window.electronAPI.analyzeUrl(inputUrl.trim());
      setVideoMetadata(meta);
      showToast(`Found: ${meta.title}`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to analyze video URL', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Start Download
  const handleStartDownload = async (req: DownloadRequest) => {
    try {
      await window.electronAPI.startDownload(req);
      showToast(`Started downloading: ${req.title}`, 'info');
      setActiveTab('queue');
    } catch (err: any) {
      showToast(err.message || 'Failed to start download', 'error');
    }
  };

  // Cancel Download
  const handleCancelDownload = async (id: string) => {
    try {
      await window.electronAPI.cancelDownload(id);
      showToast('Download cancelled', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to cancel download', 'error');
    }
  };

  // Folder Selection
  const handleChangeFolder = async () => {
    try {
      const folder = await window.electronAPI.selectFolder();
      if (folder) {
        const updated = await window.electronAPI.saveSettings({ downloadFolder: folder });
        setSettings(updated);
        showToast(`Saved download path: ${folder}`, 'success');
      }
    } catch (err: any) {
      showToast('Failed to select folder', 'error');
    }
  };

  const handleOpenDownloadsFolder = async () => {
    try {
      await window.electronAPI.openFolder(settings.downloadFolder);
    } catch {
      showToast('Failed to open downloads folder', 'error');
    }
  };

  const handleOpenFile = async (filePath: string) => {
    try {
      await window.electronAPI.openFile(filePath);
    } catch {
      showToast('Failed to locate file', 'error');
    }
  };

  // Update yt-dlp
  const handleUpdateYtDlp = async () => {
    setIsUpdatingBinary(true);
    try {
      const res = await window.electronAPI.updateYtDlp();
      if (res.success) {
        showToast(res.message, 'success');
        const status = await window.electronAPI.getBinaryStatus();
        setBinaryStatus(status);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update engine', 'error');
    } finally {
      setIsUpdatingBinary(false);
    }
  };

  const handleClearCompleted = () => {
    setDownloads((prev) => prev.filter((d) => d.status === 'downloading' || d.status === 'processing'));
  };

  const handleClearHistory = async () => {
    await window.electronAPI.clearHistory();
    setHistory([]);
    showToast('Download history cleared', 'info');
  };

  const handleDeleteHistoryItem = async (id: string) => {
    await window.electronAPI.deleteHistoryItem(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSaveSettings = async (updates: Partial<AppSettings>) => {
    const updated = await window.electronAPI.saveSettings(updates);
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
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenDownloadsFolder={handleOpenDownloadsFolder}
        binaryStatus={binaryStatus}
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

            {videoMetadata && (
              <VideoPreview
                metadata={videoMetadata}
                downloadFolder={settings.downloadFolder}
                onChangeFolder={handleChangeFolder}
                onStartDownload={handleStartDownload}
              />
            )}

            {!videoMetadata && !isAnalyzing && (
              <div
                className="glass-card"
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    boxShadow: 'var(--accent-glow)',
                  }}
                >
                  <Sparkles size={28} />
                </div>
                <h3 style={{ fontSize: '20px' }}>Ready to Download in Highest Quality</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6' }}>
                  Paste any YouTube video, Short, or audio URL above to extract up to 4K 60fps video, or crystal clear 320kbps MP3 audio with cover art.
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === 'batch' && (
          <BatchDownloader
            downloadFolder={settings.downloadFolder}
            onChangeFolder={handleChangeFolder}
            onEnqueueBatch={(requests) => {
              for (const req of requests) {
                handleStartDownload(req);
              }
            }}
            onSwitchToQueue={() => setActiveTab('queue')}
          />
        )}

        {activeTab === 'queue' && (
          <DownloadQueue
            downloads={downloads}
            onCancelDownload={handleCancelDownload}
            onClearCompleted={handleClearCompleted}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenDownloadsFolder}
          />
        )}

        {activeTab === 'history' && (
          <HistoryList
            history={history}
            onOpenFile={handleOpenFile}
            onOpenFolder={handleOpenDownloadsFolder}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

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
      />

      {/* Toasts */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.type === 'success' && <CheckCircle2 size={16} color="#10b981" />}
            {t.type === 'error' && <AlertCircle size={16} color="#f87171" />}
            {t.type === 'info' && <Info size={16} color="#06b6d4" />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
