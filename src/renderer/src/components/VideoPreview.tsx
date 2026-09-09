import React, { useState } from 'react';
import { VideoMetadata, DownloadRequest } from '../types';
import {
  Video,
  Music,
  Download,
  Folder,
  Subtitles,
  Image as ImageIcon,
  Eye,
} from 'lucide-react';

interface VideoPreviewProps {
  metadata: VideoMetadata;
  downloadFolder: string;
  onChangeFolder: () => void;
  onStartDownload: (request: DownloadRequest) => void;
  isElectron: boolean;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  metadata,
  downloadFolder,
  onChangeFolder,
  onStartDownload,
  isElectron,
}) => {
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<'mp3' | 'm4a' | 'flac' | 'wav'>('mp3');
  const [embedSubtitles, setEmbedSubtitles] = useState<boolean>(false);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>(
    metadata.subtitles[0]?.lang || 'en'
  );
  const [embedThumbnail, setEmbedThumbnail] = useState<boolean>(true);

  const highestFormat = metadata.videoFormats[0];
  const maxRes = highestFormat?.resolution || 'HD';

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
  };

  const handleDownload = () => {
    const req: DownloadRequest = {
      id: `${metadata.id}-${Date.now()}`,
      url: metadata.url,
      title: metadata.title,
      thumbnail: metadata.thumbnail,
      channel: metadata.uploader || metadata.channel,
      formatType,
      quality: formatType === 'video' ? selectedQuality : selectedAudioFormat,
      audioFormat: selectedAudioFormat,
      outputPath: downloadFolder,
      embedSubtitles: formatType === 'video' && embedSubtitles,
      subtitleLang: selectedSubtitleLang,
      embedThumbnail,
    };
    onStartDownload(req);
  };

  return (
    <div className="media-preview-container">
      {/* Left: Thumbnail & Duration */}
      <div className="preview-media-frame">
        <img
          src={metadata.thumbnail}
          alt={metadata.title}
          className="preview-media-img"
        />
        <div className="preview-media-badge">{maxRes}</div>
        <div
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            background: 'rgba(0,0,0,0.85)',
            color: '#fff',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {metadata.durationFormatted}
        </div>
      </div>

      {/* Right: Info & Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '18px' }}>
        <div>
          <h2 style={{ fontSize: '18px', lineHeight: '1.35', marginBottom: '6px' }} title={metadata.title}>
            {metadata.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{metadata.uploader}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={14} />
              {formatViews(metadata.viewCount)}
            </span>
          </div>
        </div>

        {/* Video vs Audio Segmented Toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="segmented-nav" style={{ width: 'fit-content' }}>
            <button
              className={`segmented-btn ${formatType === 'video' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('video');
                setSelectedQuality('best');
              }}
            >
              <Video size={14} />
              <span>Video (MP4)</span>
            </button>
            <button
              className={`segmented-btn ${formatType === 'audio' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('audio');
                setSelectedQuality('mp3');
              }}
            >
              <Music size={14} />
              <span>Audio Only (MP3 / FLAC)</span>
            </button>
          </div>

          {/* Quality Cards Grid */}
          {formatType === 'video' ? (
            <div className="format-card-grid">
              <div
                className={`format-card ${selectedQuality === 'best' ? 'selected' : ''}`}
                onClick={() => setSelectedQuality('best')}
              >
                <span className="format-label">Best Quality</span>
                <span className="format-sub">Original 4K/HD</span>
              </div>

              {metadata.videoFormats.slice(0, 5).map((f) => (
                <div
                  key={f.formatId}
                  className={`format-card ${selectedQuality === f.resolution ? 'selected' : ''}`}
                  onClick={() => setSelectedQuality(f.resolution || f.formatId)}
                >
                  <span className="format-label">{f.resolution}</span>
                  <span className="format-sub">
                    {f.filesizeFormatted !== 'Unknown size' ? f.filesizeFormatted : `${f.fps || 30} fps`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="format-card-grid">
              {[
                { id: 'mp3', label: 'MP3 (320k)', sub: 'High Quality' },
                { id: 'm4a', label: 'M4A (AAC)', sub: 'Apple / Fast' },
                { id: 'flac', label: 'FLAC', sub: 'Hi-Fi Lossless' },
                { id: 'wav', label: 'WAV', sub: 'Raw Studio' },
              ].map((a) => (
                <div
                  key={a.id}
                  className={`format-card ${selectedAudioFormat === a.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAudioFormat(a.id as any)}
                >
                  <span className="format-label">{a.label}</span>
                  <span className="format-sub">{a.sub}</span>
                </div>
              ))}
            </div>
          )}

          {/* Options: Subtitles & Cover Art */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ImageIcon size={14} />
                Embed Cover Art
              </span>
            </label>

            {formatType === 'video' && metadata.subtitles.length > 0 && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={embedSubtitles}
                  onChange={(e) => setEmbedSubtitles(e.target.checked)}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Subtitles size={14} />
                  Embed Subtitles
                </span>
                {embedSubtitles && (
                  <select
                    value={selectedSubtitleLang}
                    onChange={(e) => setSelectedSubtitleLang(e.target.value)}
                    style={{
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}
                  >
                    {metadata.subtitles.map((s) => (
                      <option key={s.lang} value={s.lang}>
                        {s.name} ({s.lang})
                      </option>
                    ))}
                  </select>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Footer: Destination + Download CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '14px', borderTop: '1px solid var(--border-default)' }}>
          {isElectron ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Folder size={14} />
              <span>Save to:</span>
              <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                {downloadFolder || 'Loading...'}
              </span>
              <button
                onClick={onChangeFolder}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                Change
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Saved to your browser / mobile Downloads folder
            </span>
          )}

          <button className="btn-primary-action" onClick={handleDownload}>
            <Download size={16} />
            <span>Download {formatType === 'video' ? 'Video' : 'Audio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
