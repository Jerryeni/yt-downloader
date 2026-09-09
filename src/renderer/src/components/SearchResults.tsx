import React, { useState } from 'react';
import { SearchResultItem } from '../types';
import { Search, Loader2, Video, Music } from 'lucide-react';

interface SearchResultsProps {
  onSelectVideo: (url: string) => void;
  onQuickDownload: (item: SearchResultItem, formatType: 'video' | 'audio') => void;
  onPerformSearch: (query: string) => Promise<SearchResultItem[]>;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  onSelectVideo,
  onQuickDownload,
  onPerformSearch,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const items = await onPerformSearch(query.trim());
      setResults(items);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form onSubmit={handleSearch} className="search-bar-wrapper">
        <Search size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
        <input
          type="text"
          className="search-input"
          placeholder="Search YouTube for songs, artists, channels, or video titles..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isSearching}
        />
        <button
          type="submit"
          className="btn-primary-action"
          disabled={!query.trim() || isSearching}
        >
          {isSearching ? <Loader2 size={16} className="spin-animation" /> : 'Search'}
        </button>
      </form>

      {results.length > 0 ? (
        <div className="search-results-grid">
          {results.map((item) => (
            <div key={item.id} className="search-card">
              <div className="search-card-media" onClick={() => onSelectVideo(item.url)}>
                <img src={item.thumbnail} alt={item.title} className="search-card-thumb" />
                <span className="search-card-duration">{item.durationFormatted}</span>
              </div>

              <div className="search-card-content">
                <div>
                  <h4
                    className="search-card-title"
                    title={item.title}
                    onClick={() => onSelectVideo(item.url)}
                  >
                    {item.title}
                  </h4>
                  <span className="search-card-channel">{item.uploader}</span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    onClick={() => onQuickDownload(item, 'video')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Download 1080p MP4"
                  >
                    <Video size={13} />
                    <span>MP4</span>
                  </button>

                  <button
                    onClick={() => onQuickDownload(item, 'audio')}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '8px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-muted)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-default)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    title="Download 320kbps MP3"
                  >
                    <Music size={13} />
                    <span>MP3</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isSearching && (
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
            <Search size={32} color="var(--text-muted)" />
            <h3 style={{ fontSize: '18px' }}>Search YouTube from Within the App</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '420px' }}>
              Find any video, podcast, or music track directly without opening a browser and download it in one click.
            </p>
          </div>
        )
      )}
    </div>
  );
};
