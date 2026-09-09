import React, { useState } from 'react';
import { DownloadHistoryItem } from '../types';
import {
  FolderOpen,
  ExternalLink,
  Trash2,
  Search,
  Video,
  Music,
  Clock,
  History,
} from 'lucide-react';

interface HistoryListProps {
  history: DownloadHistoryItem[];
  onOpenFile: (filePath: string) => void;
  onOpenFolder: (folderPath?: string) => void;
  onDeleteHistoryItem: (id: string) => void;
  onClearHistory: () => void;
  isElectron: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onOpenFile,
  onOpenFolder,
  onDeleteHistoryItem,
  onClearHistory,
  isElectron,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = history.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.channel.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (history.length === 0) {
    return (
      <div
        className="solid-card"
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <History size={32} color="var(--text-muted)" />
        <h3 style={{ fontSize: '17px' }}>No Download History</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
          Completed downloads will appear here for fast access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          className="search-bar-wrapper"
          style={{ width: '300px', padding: '4px 10px' }}
        >
          <Search size={15} color="var(--text-muted)" style={{ marginRight: '8px' }} />
          <input
            type="text"
            className="search-input"
            placeholder="Filter history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button
          onClick={onClearHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            background: 'var(--danger-subtle)',
            color: 'var(--danger)',
            border: '1px solid var(--border-default)',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          <span>Clear All</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {filtered.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{
                    width: '64px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.formatType === 'audio' ? <Music size={15} /> : <Video size={15} />}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    maxWidth: '440px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: 'var(--text-primary)',
                  }}
                  title={item.title}
                >
                  {item.title}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>{item.channel}</span>
                  <span>•</span>
                  <span style={{ textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 600 }}>
                    {item.quality}
                  </span>
                  <span>•</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={12} />
                    {formatDate(item.completedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {isElectron && (
                <button
                  className="icon-btn"
                  title="Show in Finder / Explorer"
                  onClick={() => onOpenFolder(item.filePath)}
                >
                  <FolderOpen size={15} />
                </button>
              )}

              <button
                className="icon-btn"
                title="Play Media"
                onClick={() => onOpenFile(item.filePath)}
              >
                <ExternalLink size={15} />
              </button>

              <button
                className="icon-btn"
                title="Remove from history"
                onClick={() => onDeleteHistoryItem(item.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
