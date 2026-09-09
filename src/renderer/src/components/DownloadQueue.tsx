import React from 'react';
import { DownloadProgress } from '../types';
import {
  FolderOpen,
  ExternalLink,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

interface DownloadQueueProps {
  downloads: DownloadProgress[];
  onCancelDownload: (id: string) => void;
  onClearCompleted: () => void;
  onOpenFile: (filePath: string) => void;
  onOpenFolder: (folderPath?: string) => void;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  downloads,
  onCancelDownload,
  onClearCompleted,
  onOpenFile,
  onOpenFolder,
}) => {
  if (downloads.length === 0) {
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
          <CheckCircle2 size={28} />
        </div>
        <h3 style={{ fontSize: '18px' }}>No Active Downloads</h3>
        <p style={{ color: '#94a3b8', fontSize: '14px', maxWidth: '380px' }}>
          Paste a YouTube link in the Downloader tab to start grabbing high-quality video or audio.
        </p>
      </div>
    );
  }

  const completedCount = downloads.filter((d) => d.status === 'completed' || d.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Active & Recent Downloads
          <span className="badge-count" style={{ background: 'var(--accent-primary)' }}>
            {downloads.length}
          </span>
        </h3>

        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={13} />
            <span>Clear Completed</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {downloads.map((item) => {
          const isFinished = item.status === 'completed';
          const isProcessing = item.status === 'processing';
          const isError = item.status === 'error';
          const isCancelled = item.status === 'cancelled';

          return (
            <div key={item.id} className="download-card">
              <div className="download-card-body">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="download-thumb" />
                ) : (
                  <div className="download-thumb" />
                )}

                <div className="download-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="download-title" title={item.title}>
                      {item.title}
                    </span>
                    <span className={`status-pill status-${item.status}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="download-meta">
                    {item.status === 'downloading' && (
                      <>
                        <span style={{ color: 'var(--accent-secondary)' }}>{item.speed}</span>
                        <span>•</span>
                        <span>ETA: {item.eta}</span>
                        <span>•</span>
                        <span>
                          {item.downloadedBytes} / {item.totalBytes}
                        </span>
                      </>
                    )}

                    {isProcessing && (
                      <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={13} className="spin-animation" />
                        Merging video & audio streams...
                      </span>
                    )}

                    {isFinished && (
                      <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} />
                        Download completed successfully
                      </span>
                    )}

                    {isError && (
                      <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} />
                        {item.error || 'Failed'}
                      </span>
                    )}

                    {isCancelled && (
                      <span style={{ color: '#94a3b8' }}>Cancelled</span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="download-actions">
                  {isFinished && item.filePath && (
                    <>
                      <button
                        className="action-icon-btn"
                        title="Show in Finder / Explorer"
                        onClick={() => onOpenFolder(item.filePath!)}
                      >
                        <FolderOpen size={16} />
                      </button>
                      <button
                        className="action-icon-btn"
                        title="Open Media"
                        onClick={() => onOpenFile(item.filePath!)}
                      >
                        <ExternalLink size={16} />
                      </button>
                    </>
                  )}

                  {(item.status === 'downloading' || isProcessing) && (
                    <button
                      className="action-icon-btn"
                      title="Cancel Download"
                      style={{ color: '#f87171' }}
                      onClick={() => onCancelDownload(item.id)}
                    >
                      <XCircle size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(item.status === 'downloading' || isProcessing) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="progress-bar-track">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: isProcessing ? '#f59e0b' : undefined,
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: '42px',
                      textAlign: 'right',
                    }}
                  >
                    {Math.round(item.percent)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
