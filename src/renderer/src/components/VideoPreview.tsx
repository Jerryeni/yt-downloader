import React, { useState } from 'react';
import {
  VideoMetadata,
  DownloadRequest,
} from '../types';
import {
  Video,
  Music,
  Download,
  Folder,
  Subtitles,
  Image as ImageIcon,
  Eye,
  Check,
} from 'lucide-react';

interface VideoPreviewProps {
  metadata: VideoMetadata;
  downloadFolder: string;
  onChangeFolder: () => void;
  onStartDownload: (request: DownloadRequest) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  metadata,
  downloadFolder,
  onChangeFolder,
  onStartDownload,
}) => {
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [selectedQuality, setSelectedQuality] = useState<string>('best');
  const [selectedAudioFormat, setSelectedAudioFormat] = useState<'mp3' | 'm4a' | 'flac' | 'wav'>('mp3');
  const [embedSubtitles, setEmbedSubtitles] = useState<boolean>(false);
  const [selectedSubtitleLang, setSelectedSubtitleLang] = useState<string>(
    metadata.subtitles[0]?.lang || 'en'
  );
  const [embedThumbnail, setEmbedThumbnail] = useState<boolean>(true);

  // Highest resolution available badge
  const highestFormat = metadata.videoFormats[0];
  const maxRes = highestFormat?.resolution || 'HD';

  // Format view count
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
    <div className="video-preview-card">
      {/* Left: Thumbnail & Media Tags */}
      <div className="preview-media">
        <img
          src={metadata.thumbnail}
          alt={metadata.title}
          className="preview-thumbnail"
        />
        <div className="preview-badge-quality">{maxRes}</div>
        <div className="preview-duration">{metadata.durationFormatted}</div>
      </div>

      {/* Right: Metadata & Download Controls */}
      <div className="preview-details">
        <div className="video-header-info">
          <h2 className="video-title" title={metadata.title}>
            {metadata.title}
          </h2>
          <div className="video-meta-row">
            <span className="meta-channel">{metadata.uploader}</span>
            <span>•</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Eye size={14} />
              {formatViews(metadata.viewCount)}
            </span>
          </div>
        </div>

        {/* Format Selector: Video vs Audio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="format-toggle-bar">
            <button
              className={`format-toggle-btn ${formatType === 'video' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('video');
                setSelectedQuality('best');
              }}
            >
              <Video size={15} />
              <span>Video (MP4)</span>
            </button>
            <button
              className={`format-toggle-btn ${formatType === 'audio' ? 'active' : ''}`}
              onClick={() => {
                setFormatType('audio');
                setSelectedQuality('mp3');
              }}
            >
              <Music size={15} />
              <span>Audio Only (MP3 / FLAC)</span>
            </button>
          </div>

          {/* Quality Grid */}
          {formatType === 'video' ? (
            <div className="quality-chips-grid">
              <div
                className={`quality-chip ${selectedQuality === 'best' ? 'selected' : ''}`}
                onClick={() => setSelectedQuality('best')}
              >
                <span className="chip-label">Best Available</span>
                <span className="chip-size">Max Quality</span>
              </div>

              {metadata.videoFormats.slice(0, 5).map((f) => (
                <div
                  key={f.formatId}
                  className={`quality-chip ${selectedQuality === f.resolution ? 'selected' : ''}`}
                  onClick={() => setSelectedQuality(f.resolution || f.formatId)}
                >
                  <span className="chip-label">{f.resolution}</span>
                  <span className="chip-size">
                    {f.filesizeFormatted !== 'Unknown size' ? f.filesizeFormatted : `${f.fps || 30} fps`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="quality-chips-grid">
              {[
                { id: 'mp3', label: 'MP3 (320kbps)', sub: 'Ultra High Quality' },
                { id: 'm4a', label: 'M4A (AAC)', sub: 'Apple / Universal' },
                { id: 'flac', label: 'FLAC', sub: 'Hi-Fi Lossless' },
                { id: 'wav', label: 'WAV', sub: 'Uncompressed' },
              ].map((a) => (
                <div
                  key={a.id}
                  className={`quality-chip ${selectedAudioFormat === a.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAudioFormat(a.id as any)}
                >
                  <span className="chip-label">{a.label}</span>
                  <span className="chip-size">{a.sub}</span>
                </div>
              ))}
            </div>
          )}

          {/* Additional Options */}
          <div className="options-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={embedThumbnail}
                onChange={(e) => setEmbedThumbnail(e.target.checked)}
                style={{ display: 'none' }}
              />
              <div className="checkbox-custom">
                {embedThumbnail && <Check size={12} color="#fff" />}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={14} />
                Embed Cover Art
              </span>
            </label>

            {formatType === 'video' && metadata.subtitles.length > 0 && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={embedSubtitles}
                  onChange={(e) => setEmbedSubtitles(e.target.checked)}
                  style={{ display: 'none' }}
                />
                <div className="checkbox-custom">
                  {embedSubtitles && <Check size={12} color="#fff" />}
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Subtitles size={14} />
                  Embed Subtitles:
                </span>
                {embedSubtitles && (
                  <select
                    value={selectedSubtitleLang}
                    onChange={(e) => setSelectedSubtitleLang(e.target.value)}
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '2px 8px',
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

        {/* Action Footer */}
        <div className="preview-action-footer">
          <div className="destination-display">
            <Folder size={16} />
            <span>Save to:</span>
            <span className="destination-path" title={downloadFolder}>
              {downloadFolder}
            </span>
            <button
              onClick={onChangeFolder}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b5cf6',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Change
            </button>
          </div>

          <button className="btn-download-hero" onClick={handleDownload}>
            <Download size={18} />
            <span>Download {formatType === 'video' ? 'Video' : 'Audio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
