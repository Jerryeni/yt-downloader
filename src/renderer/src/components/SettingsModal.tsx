import React from 'react';
import { AppSettings, BinaryStatus } from '../types';
import {
  X,
  Folder,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Sun,
  Moon,
  Sliders,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: Partial<AppSettings>) => void;
  onChangeFolder: () => void;
  binaryStatus: BinaryStatus | null;
  onUpdateYtDlp: () => Promise<void>;
  isUpdatingBinary: boolean;
  isElectron: boolean;
  onInstallFfmpeg: () => Promise<void>;
  isInstallingFfmpeg: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onChangeFolder,
  binaryStatus,
  onUpdateYtDlp,
  isUpdatingBinary,
  isElectron,
  onInstallFfmpeg,
  isInstallingFfmpeg,
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        className="solid-card"
        style={{
          width: '90%',
          maxWidth: '520px',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--primary)" />
            <h3 style={{ fontSize: '16px' }}>Settings & Performance</h3>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Appearance Switch */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
              Interface Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                onClick={() => onSaveSettings({ theme: 'light' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: settings.theme === 'light' ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                  border: settings.theme === 'light' ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Sun size={16} color="#f59e0b" />
                <span>Light Mode</span>
              </button>

              <button
                onClick={() => onSaveSettings({ theme: 'dark' })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: settings.theme === 'dark' ? 'var(--primary-subtle)' : 'var(--bg-subtle)',
                  border: settings.theme === 'dark' ? '2px solid var(--primary)' : '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <Moon size={16} color="var(--primary)" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>

          {/* Download Location (Electron) */}
          {isElectron && (
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>
                Default Download Directory
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <Folder size={16} color="var(--primary)" />
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {settings.downloadFolder || 'Loading...'}
                </span>
                <button
                  onClick={onChangeFolder}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Browse
                </button>
              </div>
            </div>
          )}

          {/* Engine Status */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} />
              Core Engine (yt-dlp & ffmpeg)
            </label>
            <div
              style={{
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {binaryStatus?.ytdlp?.available ? (
                  <CheckCircle2 size={16} color="var(--success)" />
                ) : (
                  <AlertTriangle size={16} color="var(--warning)" />
                )}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    yt-dlp Engine
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Version: {binaryStatus?.ytdlp?.version || 'Active'}
                  </div>
                </div>
              </div>

              {isElectron && (
                <button
                  onClick={onUpdateYtDlp}
                  disabled={isUpdatingBinary}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isUpdatingBinary ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={isUpdatingBinary ? 'spin-animation' : ''} />
                  <span>{isUpdatingBinary ? 'Updating...' : 'Check Updates'}</span>
                </button>
              )}
            </div>

            {/* ffmpeg: required to merge HD video with audio and to convert audio */}
            <div
              style={{
                marginTop: '8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {binaryStatus?.ffmpeg?.available ? (
                  <CheckCircle2 size={16} color="var(--success)" />
                ) : (
                  <AlertTriangle size={16} color="var(--warning)" />
                )}
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Media Converter (ffmpeg)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {binaryStatus?.ffmpeg?.available
                      ? `Version: ${binaryStatus.ffmpeg.version || 'installed'}`
                      : isInstallingFfmpeg || binaryStatus?.ffmpeg?.installing
                      ? 'Installing... HD merging will be enabled shortly'
                      : 'Missing - HD quality is capped until installed'}
                  </div>
                </div>
              </div>

              {isElectron && !binaryStatus?.ffmpeg?.available && (
                <button
                  onClick={onInstallFfmpeg}
                  disabled={isInstallingFfmpeg}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isInstallingFfmpeg ? 'not-allowed' : 'pointer',
                  }}
                >
                  <RefreshCw size={12} className={isInstallingFfmpeg ? 'spin-animation' : ''} />
                  <span>{isInstallingFfmpeg ? 'Installing...' : 'Install'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Options Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={settings.autoDetectClipboard}
                onChange={(e) => onSaveSettings({ autoDetectClipboard: e.target.checked })}
              />
              <span>Auto-detect YouTube links in clipboard</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={settings.embedThumbnailDefault}
                onChange={(e) => onSaveSettings({ embedThumbnailDefault: e.target.checked })}
              />
              <span>Embed cover art & metadata tags by default</span>
            </label>
          </div>
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-subtle)',
          }}
        >
          <button
            onClick={onClose}
            className="btn-primary-action"
            style={{ padding: '6px 16px', fontSize: '13px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
