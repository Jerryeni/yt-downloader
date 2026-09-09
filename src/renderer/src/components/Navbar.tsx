import React from 'react';
import {
  DownloadCloud,
  Layers,
  ArrowDownCircle,
  History,
  Settings,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { BinaryStatus } from '../types';

interface NavbarProps {
  activeTab: 'single' | 'batch' | 'queue' | 'history';
  setActiveTab: (tab: 'single' | 'batch' | 'queue' | 'history') => void;
  activeDownloadsCount: number;
  onOpenSettings: () => void;
  onOpenDownloadsFolder: () => void;
  binaryStatus: BinaryStatus | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  activeDownloadsCount,
  onOpenSettings,
  onOpenDownloadsFolder,
  binaryStatus,
}) => {
  const isMac = navigator.userAgent.includes('Mac');
  const isReady = binaryStatus?.ytdlp?.available;

  return (
    <header className="app-navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {isMac && <div className="mac-traffic-lights-spacer" />}
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div className="brand-title">
            NovaDownloader
            <span className="brand-badge">4K ULTRA</span>
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'single' ? 'active' : ''}`}
          onClick={() => setActiveTab('single')}
        >
          <DownloadCloud size={16} />
          <span>Downloader</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'batch' ? 'active' : ''}`}
          onClick={() => setActiveTab('batch')}
        >
          <Layers size={16} />
          <span>Batch / Playlist</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'queue' ? 'active' : ''}`}
          onClick={() => setActiveTab('queue')}
        >
          <ArrowDownCircle size={16} />
          <span>Active Downloads</span>
          {activeDownloadsCount > 0 && (
            <span className="badge-count">{activeDownloadsCount}</span>
          )}
        </button>

        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>History</span>
        </button>
      </nav>

      <div className="nav-actions">
        <button
          className="action-icon-btn"
          title="Open Downloads Folder"
          onClick={onOpenDownloadsFolder}
        >
          <FolderOpen size={18} />
        </button>

        <button
          className="action-icon-btn"
          title={`Settings & Engine Status (${isReady ? 'Ready' : 'Checking...'})`}
          onClick={onOpenSettings}
          style={{ position: 'relative' }}
        >
          <Settings size={18} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isReady ? '#10b981' : '#f59e0b',
              boxShadow: `0 0 6px ${isReady ? '#10b981' : '#f59e0b'}`,
            }}
          />
        </button>
      </div>
    </header>
  );
};
