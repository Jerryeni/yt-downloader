import React from 'react';
import { AppSettings, BinaryStatus } from '../types';
import {
  X,
  Folder,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Palette,
  Sliders,
  Check,
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
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="#8b5cf6" />
            <h2 style={{ fontSize: '18px' }}>Preferences & Engine Status</h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Storage Directory */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1' }}>
              Default Download Location
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'rgba(0,0,0,0.3)',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Folder size={16} color="#8b5cf6" />
              <span
                style={{
                  fontSize: '13px',
                  color: '#e2e8f0',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {settings.downloadFolder}
              </span>
              <button
                onClick={onChangeFolder}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Browse...
              </button>
            </div>
          </div>

          {/* Engine & Binaries */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={15} />
              Core Engine (yt-dlp & ffmpeg)
            </label>

            <div
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '10px',
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {/* yt-dlp */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {binaryStatus?.ytdlp?.available ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <AlertTriangle size={16} color="#f59e0b" />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>yt-dlp Core Engine</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Version: {binaryStatus?.ytdlp?.version || 'Auto-fetching on demand'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onUpdateYtDlp}
                  disabled={isUpdatingBinary}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isUpdatingBinary ? 'not-allowed' : 'pointer',
                    opacity: isUpdatingBinary ? 0.7 : 1,
                  }}
                >
                  <RefreshCw size={12} className={isUpdatingBinary ? 'spin-animation' : ''} />
                  <span>{isUpdatingBinary ? 'Updating...' : 'Check Updates'}</span>
                </button>
              </div>

              {/* ffmpeg */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {binaryStatus?.ffmpeg?.available ? (
                    <CheckCircle2 size={16} color="#10b981" />
                  ) : (
                    <CheckCircle2 size={16} color="#10b981" />
                  )}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>FFmpeg Media Converter</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Status: {binaryStatus?.ffmpeg?.available ? `Active (${binaryStatus.ffmpeg.version || 'installed'})` : 'Available on host'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Theme Selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Palette size={15} />
              Interface Theme
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                { id: 'cosmic', label: 'Cosmic Slate', color: '#8b5cf6' },
                { id: 'midnight', label: 'Midnight Blue', color: '#3b82f6' },
                { id: 'cyber', label: 'Cyber Cyan', color: '#00f2fe' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSaveSettings({ theme: t.id as any })}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    background: settings.theme === t.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                    border: settings.theme === t.id ? `1px solid ${t.color}` : '1px solid var(--border-subtle)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: t.color,
                    }}
                  />
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '6px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoDetectClipboard}
                onChange={(e) => onSaveSettings({ autoDetectClipboard: e.target.checked })}
                style={{ display: 'none' }}
              />
              <div className="checkbox-custom">
                {settings.autoDetectClipboard && <Check size={12} color="#fff" />}
              </div>
              <span>Automatically detect YouTube links copied to clipboard</span>
            </label>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.embedThumbnailDefault}
                onChange={(e) => onSaveSettings({ embedThumbnailDefault: e.target.checked })}
                style={{ display: 'none' }}
              />
              <div className="checkbox-custom">
                {settings.embedThumbnailDefault && <Check size={12} color="#fff" />}
              </div>
              <span>Embed cover art / thumbnail into media files by default</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: 'var(--accent-gradient)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
