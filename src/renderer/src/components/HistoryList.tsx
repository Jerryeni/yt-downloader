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
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onOpenFile,
  onOpenFolder,
  onDeleteHistoryItem,
  onClearHistory,
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
        className="glass-card"
        style={{
          textAlign: 'center',
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          <History size={28} />
        </div>
        <h3 style={{ fontSize: '18px' }}>No Download History</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Downloaded videos and audio tracks will be archived here for easy access.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '6px 12px',
            width: '320px',
          }}
        >
          <Search size={15} color="#94a3b8" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search downloads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: '13px',
              width: '100%',
            }}
          />
        </div>

        <button
          onClick={onClearHistory}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            background: 'rgba(239,68,68,0.1)',
            color: '#f87171',
            border: '1px solid rgba(239,68,68,0.2)',
            cursor: 'pointer',
          }}
        >
          <Trash2 size={13} />
          <span>Clear History</span>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filtered.map((item) => (
          <div key={item.id} className="history-item">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {item.thumbnail ? (
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{
                    width: '64px',
                    height: '38px',
                    borderRadius: '6px',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '64px',
                    height: '38px',
                    borderRadius: '6px',
                    background: '#1f293d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.formatType === 'audio' ? <Music size={16} /> : <Video size={16} />}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    maxWidth: '450px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={item.title}
                >
                  {item.title}
                </span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>{item.channel}</span>
                  <span>•</span>
                  <span style={{ textTransform: 'uppercase', color: 'var(--accent-secondary)' }}>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                className="action-icon-btn"
                title="Show in Folder"
                onClick={() => onOpenFolder(item.filePath)}
              >
                <FolderOpen size={16} />
              </button>

              <button
                className="action-icon-btn"
                title="Play Media"
                onClick={() => onOpenFile(item.filePath)}
              >
                <ExternalLink size={16} />
              </button>

              <button
                className="action-icon-btn"
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
