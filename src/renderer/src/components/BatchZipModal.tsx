import React, { useState } from 'react';
import {
  Archive,
  CheckCircle2,
  Loader2,
  X,
  FileCheck,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import { ZipFileItem, CreateZipRequest } from '../types';
import { formatProperArchiveName } from '../utils/sanitize';

export interface BatchZipModalProps {
  isOpen: boolean;
  batchTitle: string;
  files: ZipFileItem[];
  outputFolder: string;
  onClose: () => void;
  onCreateZip: (req: CreateZipRequest) => Promise<{ success: boolean; zipPath: string; error?: string }>;
  onOpenFolder?: (folderPath?: string) => void;
  isElectron: boolean;
}

export const BatchZipModal: React.FC<BatchZipModalProps> = ({
  isOpen,
  batchTitle,
  files,
  outputFolder,
  onClose,
  onCreateZip,
  onOpenFolder,
  isElectron,
}) => {
  const [archiveName, setArchiveName] = useState(() => formatProperArchiveName(batchTitle || 'Batch_Download'));
  const [deleteOriginals, setDeleteOriginals] = useState(false);
  const [status, setStatus] = useState<'prompt' | 'zipping' | 'success' | 'error'>('prompt');
  const [createdZipPath, setCreatedZipPath] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleStartZip = async () => {
    setStatus('zipping');
    setErrorMessage('');

    try {
      const cleanName = formatProperArchiveName(archiveName);
      const res = await onCreateZip({
        archiveName: cleanName,
        outputFolder,
        files,
        deleteOriginals,
      });

      if (res.success) {
        setCreatedZipPath(res.zipPath);
        setStatus('success');
      } else {
        setErrorMessage(res.error || 'Failed to generate ZIP archive.');
        setStatus('error');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while creating the archive.');
      setStatus('error');
    }
  };

  const handleOpenZipLocation = () => {
    if (onOpenFolder) {
      onOpenFolder(outputFolder);
    }
  };

  return (
    <div className="modal-backdrop" onClick={status === 'zipping' ? undefined : onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: '540px', width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: status === 'success' ? 'var(--success-subtle)' : 'var(--primary-subtle)',
                color: status === 'success' ? 'var(--success)' : 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {status === 'success' ? <CheckCircle2 size={22} /> : <Archive size={22} />}
            </div>
            <div>
              <h3 style={{ fontSize: '18px', margin: 0 }}>
                {status === 'success'
                  ? 'ZIP Archive Created!'
                  : status === 'zipping'
                  ? 'Compressing Files...'
                  : 'Batch Download Completed!'}
              </h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                {status === 'success'
                  ? 'Your archive is ready and saved to your downloads.'
                  : `${files.length} items downloaded. Would you like to package them into a clean ZIP?`}
              </p>
            </div>
          </div>

          {status !== 'zipping' && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Prompt Body */}
        {status === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Archive Filename
              </label>
              <input
                type="text"
                className="search-input"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 500,
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                }}
                value={archiveName}
                onChange={(e) => setArchiveName(e.target.value)}
                placeholder="e.g. My_Playlist.zip"
              />
            </div>

            {/* Included Files Preview */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Files Included in Archive ({files.length})
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Properly formatted titles
                </span>
              </div>

              <div
                style={{
                  maxHeight: '160px',
                  overflowY: 'auto',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <FileCheck size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {file.entryName}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            {isElectron && (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={deleteOriginals}
                  onChange={(e) => setDeleteOriginals(e.target.checked)}
                />
                <span>Delete individual uncompressed files after creating ZIP</span>
              </label>
            )}

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '8px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-default)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                No, Keep Files
              </button>

              <button
                type="button"
                className="btn-primary-action"
                onClick={handleStartZip}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Archive size={15} />
                <span>Yes, Create ZIP Archive</span>
              </button>
            </div>
          </div>
        )}

        {/* Zipping State */}
        {status === 'zipping' && (
          <div
            style={{
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              textAlign: 'center',
            }}
          >
            <Loader2 size={36} className="spin-animation" color="var(--primary)" />
            <h4 style={{ fontSize: '16px', margin: 0 }}>Compressing {files.length} Files...</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Packing proper titles into {archiveName}
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                <Archive size={16} color="var(--primary)" />
                <span>{archiveName}</span>
              </div>
              {createdZipPath && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                  {createdZipPath}
                </div>
              )}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-default)',
              }}
            >
              {isElectron && (
                <button
                  type="button"
                  onClick={handleOpenZipLocation}
                  style={{
                    padding: '9px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-default)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <FolderOpen size={15} />
                  <span>Show in Folder</span>
                </button>
              )}

              <button
                type="button"
                className="btn-primary-action"
                onClick={onClose}
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            <div
              style={{
                background: 'var(--error-subtle, rgba(239, 68, 68, 0.1))',
                border: '1px solid var(--error, #ef4444)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '12px',
                borderTop: '1px solid var(--border-default)',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '9px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-subtle)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-default)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={() => setStatus('prompt')}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
