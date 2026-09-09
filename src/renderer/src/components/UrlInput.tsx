import React from 'react';
import {
  Link2,
  ClipboardPaste,
  X,
  Search,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface UrlInputProps {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: (targetUrl?: string) => void;
  isLoading: boolean;
  clipboardUrl: string | null;
  onUseClipboardUrl: (url: string) => void;
  onDismissClipboard: () => void;
}

export const UrlInput: React.FC<UrlInputProps> = ({
  url,
  setUrl,
  onAnalyze,
  isLoading,
  clipboardUrl,
  onUseClipboardUrl,
  onDismissClipboard,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onAnalyze();
    }
  };

  const handlePasteClick = async () => {
    try {
      const text = await window.electronAPI.readClipboard();
      if (text) {
        setUrl(text.trim());
      }
    } catch (e) {
      console.error('Failed to read clipboard', e);
    }
  };

  return (
    <div className="url-input-container">
      {clipboardUrl && (
        <div className="clipboard-banner">
          <div className="clipboard-info">
            <Sparkles size={16} />
            <span>
              YouTube link detected in your clipboard:{' '}
              <strong style={{ color: '#fff' }}>
                {clipboardUrl.length > 55 ? clipboardUrl.substring(0, 52) + '...' : clipboardUrl}
              </strong>
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              className="clipboard-btn-paste"
              onClick={() => onUseClipboardUrl(clipboardUrl)}
            >
              Paste & Analyze
            </button>
            <button
              onClick={onDismissClipboard}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="url-bar-wrapper">
        <Link2 size={20} color="#8b5cf6" style={{ marginRight: '10px' }} />
        <input
          type="text"
          className="url-input-field"
          placeholder="Paste YouTube video or Shorts link here (e.g. https://www.youtube.com/watch?v=...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <div className="url-bar-actions">
          {url ? (
            <button className="btn-clear" onClick={() => setUrl('')} title="Clear input">
              <X size={14} />
              <span>Clear</span>
            </button>
          ) : (
            <button className="btn-paste" onClick={handlePasteClick} title="Paste from Clipboard">
              <ClipboardPaste size={14} />
              <span>Paste</span>
            </button>
          )}

          <button
            className="btn-analyze"
            onClick={() => onAnalyze()}
            disabled={!url.trim() || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="spin-animation" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>Analyze Video</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
