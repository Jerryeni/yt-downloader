import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SearchResultItem, SearchFilterOptions, SearchResponse } from '../types';
import {
  Search,
  Loader2,
  Video,
  Music,
  ListMusic,
  Sparkles,
  ArrowUpDown,
  Clock,
  DownloadCloud,
} from 'lucide-react';

interface SearchResultsProps {
  onSelectVideo: (url: string) => void;
  onSelectPlaylist?: (url: string) => void;
  onQuickDownload: (item: SearchResultItem, formatType: 'video' | 'audio') => void;
  onPerformSearch: (options: SearchFilterOptions) => Promise<SearchResponse>;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  onSelectVideo,
  onSelectPlaylist,
  onQuickDownload,
  onPerformSearch,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'playlist'>('all');
  const [duration, setDuration] = useState<'any' | 'short' | 'medium' | 'long'>('any');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'views'>('relevance');

  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastExecutedQuery, setLastExecutedQuery] = useState('');

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const executeSearch = async (
    targetQuery: string,
    targetType: 'all' | 'video' | 'playlist',
    targetDuration: 'any' | 'short' | 'medium' | 'long',
    targetSort: 'relevance' | 'date' | 'views',
    pageToFetch = 1,
    isAppend = false
  ) => {
    if (!targetQuery.trim()) return;

    if (isAppend) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setResults([]);
    }

    try {
      const resp = await onPerformSearch({
        query: targetQuery.trim(),
        filterType: targetType,
        duration: targetDuration,
        sortBy: targetSort,
        page: pageToFetch,
        pageSize: 16,
      });

      if (isAppend) {
        setResults((prev) => {
          // Deduplicate by ID
          const existingIds = new Set(prev.map((r) => r.id));
          const uniqueNew = resp.results.filter((r) => !existingIds.has(r.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setResults(resp.results);
        setLastExecutedQuery(targetQuery.trim());
      }

      setHasMore(resp.hasMore);
      setCurrentPage(pageToFetch);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isSearching) return;
    executeSearch(query, filterType, duration, sortBy, 1, false);
  };

  const handleFilterTypeChange = (newType: 'all' | 'video' | 'playlist') => {
    setFilterType(newType);
    if (query.trim()) {
      executeSearch(query, newType, duration, sortBy, 1, false);
    }
  };

  const handleDurationChange = (newDuration: 'any' | 'short' | 'medium' | 'long') => {
    setDuration(newDuration);
    if (query.trim()) {
      executeSearch(query, filterType, newDuration, sortBy, 1, false);
    }
  };

  const handleSortChange = (newSort: 'relevance' | 'date' | 'views') => {
    setSortBy(newSort);
    if (query.trim()) {
      executeSearch(query, filterType, duration, newSort, 1, false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || isSearching || !hasMore || !lastExecutedQuery) return;
    executeSearch(lastExecutedQuery, filterType, duration, sortBy, currentPage + 1, true);
  }, [isLoadingMore, isSearching, hasMore, lastExecutedQuery, filterType, duration, sortBy, currentPage]);

  // Infinite scroll trigger via IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isSearching) {
          handleLoadMore();
        }
      },
      { rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, isSearching, handleLoadMore]);

  const handleItemClick = (item: SearchResultItem) => {
    if (item.isPlaylist) {
      if (onSelectPlaylist) {
        onSelectPlaylist(item.url);
      } else {
        onSelectVideo(item.url);
      }
    } else {
      onSelectVideo(item.url);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Search Input Bar */}
      <form onSubmit={handleFormSubmit} className="search-bar-wrapper">
        <Search size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
        <input
          type="text"
          className="search-input"
          placeholder="Search YouTube for videos, music albums, podcasts, or full playlists..."
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

      {/* Filter & Sorting Toolbar */}
      <div className="search-toolbar">
        {/* Type Filter Pills */}
        <div className="search-filter-group">
          <button
            type="button"
            className={`search-filter-pill ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterTypeChange('all')}
          >
            <Sparkles size={14} />
            <span>All</span>
          </button>
          <button
            type="button"
            className={`search-filter-pill ${filterType === 'playlist' ? 'active' : ''}`}
            onClick={() => handleFilterTypeChange('playlist')}
          >
            <ListMusic size={14} />
            <span>Playlists</span>
          </button>
          <button
            type="button"
            className={`search-filter-pill ${filterType === 'video' ? 'active' : ''}`}
            onClick={() => handleFilterTypeChange('video')}
          >
            <Video size={14} />
            <span>Videos</span>
          </button>
        </div>

        {/* Duration & Sort Controls */}
        <div className="search-filter-group">
          {filterType !== 'playlist' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="var(--text-muted)" />
              <select
                className="search-select"
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value as any)}
                aria-label="Filter by duration"
              >
                <option value="any">Any Duration</option>
                <option value="short">Short (&lt; 4 min)</option>
                <option value="medium">Medium (4–20 min)</option>
                <option value="long">Long (&gt; 20 min)</option>
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} color="var(--text-muted)" />
            <select
              className="search-select"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as any)}
              aria-label="Sort search results"
            >
              <option value="relevance">Sort: Relevance</option>
              <option value="date">Sort: Upload Date</option>
              <option value="views">Sort: View Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* Search Results Grid */}
      {results.length > 0 ? (
        <>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0 4px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              Showing {results.length} results for <strong>"{lastExecutedQuery}"</strong>
            </span>
            {hasMore && <span>Scroll down for more</span>}
          </div>

          <div className="search-results-grid">
            {results.map((item) => {
              const isPlaylist = !!item.isPlaylist;

              return (
                <div key={`${item.id}-${item.isPlaylist ? 'pl' : 'vid'}`} className="search-card">
                  <div className="search-card-media" onClick={() => handleItemClick(item)}>
                    <img src={item.thumbnail} alt={item.title} className="search-card-thumb" />

                    {isPlaylist ? (
                      <>
                        <div className="search-card-badge-playlist">
                          <ListMusic size={12} />
                          <span>Playlist</span>
                        </div>
                        <div className="search-card-playlist-banner">
                          <ListMusic size={20} />
                          <span style={{ fontSize: '12px' }}>
                            {item.itemCount ? `${item.itemCount} items` : 'Playlist'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <span className="search-card-duration">{item.durationFormatted}</span>
                    )}
                  </div>

                  <div className="search-card-content">
                    <div>
                      <h4
                        className="search-card-title"
                        title={item.title}
                        onClick={() => handleItemClick(item)}
                      >
                        {item.title}
                      </h4>
                      <span className="search-card-channel">{item.uploader}</span>
                    </div>

                    {isPlaylist ? (
                      <button
                        onClick={() => handleItemClick(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          marginTop: '10px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--primary)',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                        title="Inspect and Batch Download Playlist"
                      >
                        <DownloadCloud size={14} />
                        <span>Inspect & Batch Download</span>
                      </button>
                    ) : (
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
                            color: '#ffffff',
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Trigger & Sentinel */}
          <div
            ref={sentinelRef}
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '24px 0',
              minHeight: '60px',
            }}
          >
            {hasMore ? (
              <button
                type="button"
                className="load-more-btn"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 size={16} className="spin-animation" />
                    <span>Loading more results...</span>
                  </>
                ) : (
                  <span>Load More Results</span>
                )}
              </button>
            ) : (
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                You've reached the end of the results.
              </span>
            )}
          </div>
        </>
      ) : isSearching ? (
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
          <Loader2 size={32} className="spin-animation" color="var(--primary)" />
          <h3 style={{ fontSize: '16px' }}>Searching YouTube...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Querying videos, playlists, and metadata.
          </p>
        </div>
      ) : (
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6' }}>
            Find any video, playlist, music track, or podcast directly without opening a browser. Filter by playlists or durations and download in one click.
          </p>
        </div>
      )}
    </div>
  );
};
