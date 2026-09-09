import React from 'react';
import {
  DownloadCloud,
  Search,
  Layers,
  ArrowDownCircle,
  History,
  Settings,
  FolderOpen,
  Sun,
  Moon,
  Tv,
} from 'lucide-react';
import { BinaryStatus } from '../types';

interface NavbarProps {
  activeTab: 'single' | 'search' | 'batch' | 'queue' | 'history';
  setActiveTab: (tab: 'single' | 'search' | 'batch' | 'queue' | 'history') => void;
  activeDownloadsCount: number;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenDownloadsFolder: () => void;
  binaryStatus: BinaryStatus | null;
  isElectron: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeDownloadsCount,
  theme,
  onToggleTheme,
  onOpenSettings,
  onOpenDownloadsFolder,
  binaryStatus,
  isElectron,
}) => {
  const isMac = navigator.userAgent.includes('Mac');
  const isReady = binaryStatus?.ytdlp?.available;

  return (
    <header className="app-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {isElectron && isMac && <div className="mac-spacer" />}
        <div className="brand-wrapper">
          <div className="brand-logo">
            <Tv size={18} />
          </div>
          <div className="brand-name">
            NovaDownloader
            <span className="brand-tag">PRO</span>
          </div>
        </div>
      </div>

      <nav className="segmented-nav">
        <button
          className={`segmented-btn ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          <DownloadCloud size={15} />
          <span>Downloader</span>
        </button>

        <button
          className={`segmented-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          <Search size={15} />
          <span>Search YouTube</span>
        </button>

        <button
          className={`segmented-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          <Layers size={15} />
          <span>Batch & Playlist</span>
        </button>

        <button
          className={`segmented-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <ArrowDownCircle size={15} />
          <span>Queue</span>
          {activeDownloadsCount > 0 && (
            <span className="badge-count">{activeDownloadsCount}</span>
          )}
        </button>

        <button
          className={`segmented-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={15} />
          <span>History</span>
        </button>
      </nav>

      <div className="nav-actions">
        {/* Instant Light/Dark Mode Switcher */}
        <button
          className="icon-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun size={17} color="#f59e0b" /> : <Moon size={17} color="#6366f1" />}
        </button>

        {isElectron && (
          <button
            className="icon-btn"
            title="Open Downloads Folder"
            onClick={onOpenDownloadsFolder}
          >
            <FolderOpen size={17} />
          </button>
        )}

        <button
          className="icon-btn"
          title={`Settings (${isReady ? 'Engine Ready' : 'Connecting'})`}
          onClick={onOpenSettings}
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
};
