import React, { useState } from 'react';
import { Layers, Download, Video, Music, Folder } from 'lucide-react';
import { DownloadRequest } from '../types';

interface BatchDownloaderProps {
  downloadFolder: string;
  onChangeFolder: () => void;
  onEnqueueBatch: (requests: DownloadRequest[]) => void;
  onSwitchToQueue: () => void;
  isElectron: boolean;
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({
  downloadFolder,
  onChangeFolder,
  onEnqueueBatch,
  onSwitchToQueue,
  isElectron,
}) => {
  const [urlsText, setUrlsText] = useState('');
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState<'best' | '1080p' | '720p' | 'mp3'>('1080p');

  const handleStartBatch = () => {
    const rawUrls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.includes('http://') || u.includes('https://')));

    if (rawUrls.length === 0) return;

    const batchId = `batch-${Date.now()}`;
    const batchTitle = `Batch Videos - ${new Date().toLocaleDateString()}`;

    const requests: DownloadRequest[] = rawUrls.map((url, index) => {
      const id = `${batchId}-${index}`;
      return {
        id,
        url,
        title: `Queued Video #${index + 1}`,
        thumbnail: '',
        formatType,
        quality: formatType === 'audio' ? 'mp3' : quality,
        audioFormat: 'mp3',
        outputPath: downloadFolder,
        embedThumbnail: true,
        batchId,
        batchTitle,
        itemIndex: index + 1,
      };
    });

    onEnqueueBatch(requests);
    setUrlsText('');
    onSwitchToQueue();
  };

  const parsedUrlCount = urlsText
    .split('\n')
    .map((u) => u.trim())
    .filter((u) => u.length > 0 && (u.includes('http://') || u.includes('https://'))).length;

  return (
    <div className="solid-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--primary-subtle)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Layers size={20} />
        </div>
        <div>
          <h2 style={{ fontSize: '17px' }}>Batch Link Downloader</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Paste multiple YouTube video URLs (one per line) to download all of them in parallel.
          </p>
        </div>
      </div>

      <textarea
        rows={6}
        className="search-input"
        style={{
          width: '100%',
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          resize: 'vertical',
        }}
        placeholder="https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=...&#10;https://youtu.be/..."
        value={urlsText}
        onChange={(e) => setUrlsText(e.target.value)}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="segmented-nav">
            <button
              className={`segmented-btn ${formatType === 'video' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('video');
                setQuality('1080p');
              }}
            >
              <Video size={13} />
              <span>Video (MP4)</span>
            </button>
            <button
              className={`segmented-btn ${formatType === 'audio' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('audio');
                setQuality('mp3');
              }}
            >
              <Music size={13} />
              <span>Audio (MP3)</span>
            </button>
          </div>

          {formatType === 'video' && (
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as any)}
              style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              <option value="best">Best Available (4K / 1080p)</option>
              <option value="1080p">1080p Full HD</option>
              <option value="720p">720p HD</option>
            </select>
          )}
        </div>

        {isElectron && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Folder size={14} />
            <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {downloadFolder}
            </span>
            <button
              onClick={onChangeFolder}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Change
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-default)' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {parsedUrlCount} {parsedUrlCount === 1 ? 'URL' : 'URLs'} detected
        </span>

        <button
          className="btn-primary-action"
          disabled={parsedUrlCount === 0}
          onClick={handleStartBatch}
        >
          <Download size={15} />
          <span>Start Batch Download ({parsedUrlCount})</span>
        </button>
      </div>
    </div>
  );
};
