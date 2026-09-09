import React, { useState } from 'react';
import { PlaylistMetadata, DownloadRequest } from '../types';
import { ListVideo, Download, CheckSquare, Square, Video, Music } from 'lucide-react';

interface PlaylistViewProps {
  playlist: PlaylistMetadata;
  downloadFolder: string;
  onEnqueueBatch: (requests: DownloadRequest[]) => void;
  onClose: () => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  playlist,
  downloadFolder,
  onEnqueueBatch,
  onClose,
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(playlist.items.map((i) => i.id))
  );
  const [formatType, setFormatType] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('1080p');

  const toggleSelectAll = () => {
    if (selectedIds.size === playlist.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(playlist.items.map((i) => i.id)));
    }
  };

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDownload = () => {
    const selectedItems = playlist.items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    const requests: DownloadRequest[] = selectedItems.map((item, idx) => ({
      id: `playlist-${playlist.id}-${item.id}-${idx}`,
      url: item.url,
      title: item.title,
      thumbnail: item.thumbnail,
      channel: playlist.uploader,
      formatType,
      quality: formatType === 'audio' ? 'mp3' : quality,
      audioFormat: 'mp3',
      outputPath: downloadFolder,
      embedThumbnail: true,
    }));

    onEnqueueBatch(requests);
    onClose();
  };

  return (
    <div className="solid-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
            <ListVideo size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '17px' }}>{playlist.title}</h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {playlist.uploader} • {playlist.itemCount} videos
            </span>
          </div>
        </div>

        <button
          onClick={toggleSelectAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {selectedIds.size === playlist.items.length ? (
            <CheckSquare size={14} color="var(--primary)" />
          ) : (
            <Square size={14} />
          )}
          <span>{selectedIds.size === playlist.items.length ? 'Deselect All' : 'Select All'}</span>
        </button>
      </div>

      {/* Playlist Items List */}
      <div className="playlist-items-table">
        {playlist.items.map((item) => {
          const isSelected = selectedIds.has(item.id);
          return (
            <div
              key={item.id}
              className="playlist-row"
              onClick={() => toggleItem(item.id)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleItem(item.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '20px' }}>
                  {item.index}
                </span>
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  style={{
                    width: '60px',
                    height: '34px',
                    borderRadius: '4px',
                    objectFit: 'cover',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {item.title}
                </span>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {item.durationFormatted}
              </span>
            </div>
          );
        })}
      </div>

      {/* Controls & Download CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-default)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="segmented-nav">
            <button
              className={`segmented-btn ${formatType === 'video' ? 'active' : ''}`}
              onClick={() => setFormatType('video')}
            >
              <Video size={13} />
              <span>MP4</span>
            </button>
            <button
              className={`segmented-btn ${formatType === 'audio' ? 'active' : ''}`}
              onClick={() => setFormatType('audio')}
            >
              <Music size={13} />
              <span>MP3</span>
            </button>
          </div>

          {formatType === 'video' && (
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
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
              <option value="best">Best (4K / 1080p)</option>
              <option value="1080p">1080p FHD</option>
              <option value="720p">720p HD</option>
            </select>
          )}
        </div>

        <button
          className="btn-primary-action"
          disabled={selectedIds.size === 0}
          onClick={handleDownload}
        >
          <Download size={15} />
          <span>Download Selected ({selectedIds.size})</span>
        </button>
      </div>
    </div>
  );
};
