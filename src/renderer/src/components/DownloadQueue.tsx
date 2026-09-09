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
  isElectron: boolean;
}

export const DownloadQueue: React.FC<DownloadQueueProps> = ({
  downloads,
  onCancelDownload,
  onClearCompleted,
  onOpenFile,
  onOpenFolder,
  isElectron,
}) => {
  if (downloads.length === 0) {
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
        <CheckCircle2 size={32} color="var(--text-muted)" />
        <h3 style={{ fontSize: '17px' }}>No Active Downloads</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '360px' }}>
          Paste a link or search for any video to start downloading in maximum resolution.
        </p>
      </div>
    );
  }

  const completedCount = downloads.filter((d) => d.status === 'completed' || d.status === 'error').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Active & Recent Downloads
          <span className="badge-count">{downloads.length}</span>
        </h3>

        {completedCount > 0 && (
          <button
            onClick={onClearCompleted}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-default)',
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
            <div key={item.id} className="download-item-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{
                      width: '84px',
                      height: '48px',
                      borderRadius: 'var(--radius-sm)',
                      objectFit: 'cover',
                      backgroundColor: '#000',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '84px',
                      height: '48px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-subtle)',
                    }}
                  />
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        maxWidth: '480px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                    <span className={`pill-status pill-${item.status}`}>{item.status}</span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {item.status === 'downloading' && (
                      <>
                        <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{item.speed}</span>
                        <span>•</span>
                        <span>ETA: {item.eta}</span>
                        <span>•</span>
                        <span>
                          {item.downloadedBytes} / {item.totalBytes}
                        </span>
                      </>
                    )}

                    {isProcessing && (
                      <span style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Loader2 size={13} className="spin-animation" />
                        Merging streams...
                      </span>
                    )}

                    {isFinished && (
                      <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} />
                        Completed
                      </span>
                    )}

                    {isError && (
                      <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={14} />
                        {item.error || 'Failed'}
                      </span>
                    )}

                    {isCancelled && <span>Cancelled</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isFinished && item.filePath && isElectron && (
                    <>
                      <button
                        className="icon-btn"
                        title="Show in Finder / Explorer"
                        onClick={() => onOpenFolder(item.filePath!)}
                      >
                        <FolderOpen size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Open File"
                        onClick={() => onOpenFile(item.filePath!)}
                      >
                        <ExternalLink size={16} />
                      </button>
                    </>
                  )}

                  {(item.status === 'downloading' || isProcessing) && (
                    <button
                      className="icon-btn"
                      title="Cancel Download"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => onCancelDownload(item.id)}
                    >
                      <XCircle size={17} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {(item.status === 'downloading' || isProcessing) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${item.percent}%`,
                        backgroundColor: isProcessing ? 'var(--warning)' : 'var(--primary)',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: '40px',
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
