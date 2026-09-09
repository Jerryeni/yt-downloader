import React from 'react';
import {
  Link2,
  ClipboardPaste,
  X,
  ArrowRight,
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
  const isMac = navigator.userAgent.includes('Mac');
  const pasteShortcut = isMac ? '⌘V' : 'Ctrl+V';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && url.trim() && !isLoading) {
      onAnalyze();
    }
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setUrl(text.trim());
      }
    } catch (e) {
      console.error('Failed to paste', e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {clipboardUrl && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-subtle)',
            border: '1px solid var(--border-focus)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Sparkles size={16} color="var(--primary)" />
            <span>
              Detected YouTube link:{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {clipboardUrl.length > 50 ? clipboardUrl.substring(0, 47) + '...' : clipboardUrl}
              </strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onUseClipboardUrl(clipboardUrl)}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Paste & Analyze
            </button>
            <button
              onClick={onDismissClipboard}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      <div className="search-bar-wrapper">
        <Link2 size={18} color="var(--primary)" style={{ marginRight: '10px' }} />
        <input
          type="text"
          className="search-input"
          placeholder={`Paste YouTube video, Short, or playlist link (${pasteShortcut})...`}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {url ? (
            <button
              onClick={() => setUrl('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
              title="Clear input"
            >
              <X size={15} />
            </button>
          ) : (
            <button
              onClick={handlePaste}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
              title="Paste from clipboard"
            >
              <ClipboardPaste size={13} />
              <span>Paste</span>
            </button>
          )}

          <button
            className="btn-primary-action"
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
                <span>Analyze</span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
