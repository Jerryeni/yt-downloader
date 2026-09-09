import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import { BinaryManager } from './binaryManager';
import {
  DownloadRequest,
  DownloadProgress,
  VideoMetadata,
  VideoFormat,
  DownloadHistoryItem,
  SearchResultItem,
  SearchFilterOptions,
  SearchResponse,
  PlaylistMetadata,
  PlaylistItem,
} from '../shared/types';
import { AppStore } from './store';

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) {
    return `${hrs}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export class DownloadEngine extends EventEmitter {
  private binaryManager: BinaryManager;
  private store: AppStore;
  private activeProcesses: Map<string, ChildProcess> = new Map();
  private downloadQueue: DownloadRequest[] = [];
  private runningDownloads: Set<string> = new Set();
  private failedRequests: Map<string, DownloadRequest> = new Map();
  private cancelledIds: Set<string> = new Set();
  // Default keeps network & DNS sockets healthy during large batch downloads;
  // the user's setting overrides it within a safe range.
  private maxConcurrent: number = 2;

  constructor(binaryManager: BinaryManager, store: AppStore) {
    super();
    this.binaryManager = binaryManager;
    this.store = store;
    this.syncConcurrencyFromSettings();
  }

  public syncConcurrencyFromSettings(): void {
    const configured = this.store.getSettings().maxConcurrentDownloads;
    if (typeof configured === 'number' && !isNaN(configured)) {
      this.maxConcurrent = Math.min(Math.max(Math.floor(configured), 1), 5);
    }
  }

  /**
   * Smart YouTube Search with Filters & Pagination
   */
  public async searchVideos(options: SearchFilterOptions): Promise<SearchResponse> {
    const ytDlp = await this.binaryManager.getYtDlpPath();
    const page = options.page || 1;
    const pageSize = options.pageSize || 16;
    const startIdx = (page - 1) * pageSize + 1;
    const endIdx = page * pageSize;
    const query = options.query.trim();

    let searchTarget = '';
    if (options.filterType === 'playlist') {
      searchTarget = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAw%253D%253D`;
    } else {
      let spParam = '';
      if (options.duration === 'short') spParam = 'EgQQARgB';
      else if (options.duration === 'medium') spParam = 'EgQQARgD';
      else if (options.duration === 'long') spParam = 'EgQQARgC';
      else if (options.sortBy === 'date') spParam = 'CAI%253D';
      else if (options.sortBy === 'views') spParam = 'CAM%253D';
      else if (options.filterType === 'video') spParam = 'EgIQAQ%253D%253D';

      if (spParam) {
        searchTarget = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${spParam}`;
      } else {
        searchTarget = `ytsearch${endIdx + 8}:${query}`;
      }
    }

    return new Promise((resolve, reject) => {
      const args = [
        searchTarget,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--skip-download',
        '--playlist-start',
        String(startIdx),
        '--playlist-end',
        String(endIdx),
        '--extractor-args',
        'youtube:player_client=android,web',
      ];

      const proc = spawn(ytDlp, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `Search failed with code ${code}`));
        }

        try {
          const raw = JSON.parse(stdout);
          const entries: any[] = raw.entries || [];
          const results: SearchResultItem[] = entries.map((e) => {
            const isPlaylist =
              options.filterType === 'playlist' ||
              e._type === 'playlist' ||
              (e.url && e.url.includes('list=')) ||
              (e.id && e.id.startsWith('PL'));

            return {
              id: e.id,
              url: e.url || (isPlaylist ? `https://www.youtube.com/playlist?list=${e.id}` : `https://www.youtube.com/watch?v=${e.id}`),
              title: e.title || 'Untitled',
              uploader: e.uploader || e.channel || 'YouTube Creator',
              durationFormatted: isPlaylist ? 'Playlist' : formatDuration(e.duration || 0),
              thumbnail: e.thumbnails?.[0]?.url || (e.id ? `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg` : ''),
              viewCount: e.view_count,
              isPlaylist,
              itemCount: e.playlist_count || (isPlaylist ? undefined : undefined),
            };
          });

          resolve({
            results,
            hasMore: entries.length >= pageSize,
            page,
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse search results: ${err.message}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`Failed to execute search: ${err.message}`)));
    });
  }

  /**
   * Fast Playlist Item Extractor
   */
  public async extractPlaylist(url: string): Promise<PlaylistMetadata> {
    const ytDlp = await this.binaryManager.getYtDlpPath();

    return new Promise((resolve, reject) => {
      const args = [
        url,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--skip-download',
        '--extractor-args',
        'youtube:player_client=android,web',
      ];

      const proc = spawn(ytDlp, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => (stdout += d.toString()));
      proc.stderr.on('data', (d) => (stderr += d.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `Playlist extraction failed with code ${code}`));
        }

        try {
          const raw = JSON.parse(stdout);
          const entries: any[] = raw.entries || [];
          const items: PlaylistItem[] = entries.map((e, index) => ({
            id: e.id,
            url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
            title: e.title || `Track #${index + 1}`,
            durationFormatted: formatDuration(e.duration || 0),
            thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
            index: index + 1,
          }));

          resolve({
            id: raw.id || 'playlist',
            title: raw.title || 'YouTube Playlist',
            uploader: raw.uploader || raw.channel || 'YouTube',
            itemCount: items.length,
            items,
          });
        } catch (err: any) {
          reject(new Error(`Failed to parse playlist: ${err.message}`));
        }
      });

      proc.on('error', (err) => reject(new Error(`Failed to extract playlist: ${err.message}`)));
    });
  }

  /**
   * Accelerated Video Metadata Extraction
   */
  public async extractMetadata(url: string): Promise<VideoMetadata> {
    const ytDlp = await this.binaryManager.getYtDlpPath();

    return new Promise((resolve, reject) => {
      const args = [
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--skip-download',
        '--extractor-args',
        'youtube:player_client=android,web',
        '--js-runtimes',
        'node',
        url,
      ];

      const proc = spawn(ytDlp, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(stderr || `Failed to fetch video information (exit code ${code})`));
        }

        try {
          const raw = JSON.parse(stdout);
          const rawFormats: any[] = raw.formats || [];

          const videoFormatsMap = new Map<string, VideoFormat>();
          const audioFormats: VideoFormat[] = [];

          for (const f of rawFormats) {
            const isAudio = f.vcodec === 'none' && f.acodec !== 'none';
            const isVideo = f.vcodec !== 'none';

            if (isAudio) {
              audioFormats.push({
                formatId: f.format_id,
                formatNote: f.format_note || f.ext,
                ext: f.ext,
                filesize: f.filesize || f.filesize_approx,
                filesizeFormatted: formatBytes(f.filesize || f.filesize_approx),
                isAudioOnly: true,
                isVideoOnly: false,
                qualityRank: f.abr || 128,
              });
            } else if (isVideo && f.height) {
              const resKey = `${f.height}p`;
              const existing = videoFormatsMap.get(resKey);
              const currentFilesize = f.filesize || f.filesize_approx || 0;

              if (!existing || (f.fps && f.fps > (existing.fps || 30)) || currentFilesize > (existing.filesize || 0)) {
                videoFormatsMap.set(resKey, {
                  formatId: f.format_id,
                  resolution: `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`,
                  ext: 'mp4',
                  filesize: currentFilesize,
                  filesizeFormatted: formatBytes(currentFilesize),
                  fps: f.fps,
                  vcodec: f.vcodec,
                  acodec: f.acodec,
                  isAudioOnly: false,
                  isVideoOnly: f.acodec === 'none',
                  qualityRank: f.height,
                });
              }
            }
          }

          const videoFormats = Array.from(videoFormatsMap.values()).sort(
            (a, b) => b.qualityRank - a.qualityRank
          );

          const subtitles: Array<{ lang: string; name: string }> = [];
          if (raw.subtitles) {
            for (const lang of Object.keys(raw.subtitles)) {
              subtitles.push({
                lang,
                name: raw.subtitles[lang][0]?.name || lang,
              });
            }
          }

          const metadata: VideoMetadata = {
            id: raw.id,
            url,
            title: raw.title || 'Untitled Video',
            uploader: raw.uploader || raw.channel || 'Unknown Creator',
            uploaderUrl: raw.uploader_url || raw.channel_url,
            channel: raw.channel,
            duration: raw.duration || 0,
            durationFormatted: formatDuration(raw.duration || 0),
            viewCount: raw.view_count || 0,
            uploadDate: raw.upload_date,
            thumbnail: raw.thumbnail || '',
            description: raw.description,
            videoFormats,
            audioFormats,
            subtitles,
          };

          resolve(metadata);
        } catch (parseError: any) {
          reject(new Error(`Failed to parse video metadata: ${parseError.message}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
      });
    });
  }

  /**
   * Queue-Managed Ultra-Fast Download Engine
   */
  public async startDownload(request: DownloadRequest): Promise<void> {
    // Resolve ffmpeg before a slot is claimed. The first run on a machine with
    // no converter may spend minutes installing it, and holding a concurrency
    // slot for that would stall every other item in a batch.
    if (!(await this.binaryManager.findFfmpeg())) {
      this.emit('progress', {
        id: request.id,
        url: request.url,
        title: request.title,
        thumbnail: request.thumbnail,
        percent: 0,
        speed: 'Preparing',
        eta: '--:--',
        downloadedBytes: '0 MB',
        totalBytes: 'Setting up media converter...',
        status: 'queued',
        startedAt: Date.now(),
        batchId: request.batchId,
        batchTitle: request.batchTitle,
        itemIndex: request.itemIndex,
      });
      // Shared across concurrent callers, so a batch triggers a single install.
      await this.binaryManager.getFfmpegPath();
    }

    // If running processes are below concurrency limit, execute immediately
    if (this.runningDownloads.size < this.maxConcurrent) {
      this.runningDownloads.add(request.id);
      this.emit('progress', {
        id: request.id,
        url: request.url,
        title: request.title,
        thumbnail: request.thumbnail,
        percent: 0,
        speed: '0 MB/s',
        eta: '--:--',
        downloadedBytes: '0 MB',
        totalBytes: 'Starting...',
        status: 'downloading',
        startedAt: Date.now(),
        batchId: request.batchId,
        batchTitle: request.batchTitle,
        itemIndex: request.itemIndex,
      });
      this.executeDownload(request);
    } else {
      // Put in queue and notify frontend
      this.downloadQueue.push(request);
      this.emit('progress', {
        id: request.id,
        url: request.url,
        title: request.title,
        thumbnail: request.thumbnail,
        percent: 0,
        speed: 'Queued',
        eta: 'Waiting in queue...',
        downloadedBytes: '0 MB',
        totalBytes: 'In Queue',
        status: 'queued',
        startedAt: Date.now(),
        batchId: request.batchId,
        batchTitle: request.batchTitle,
        itemIndex: request.itemIndex,
      });
    }
  }

  private processNextInQueue(): void {
    // Fill every free slot: a single completion can release capacity for more
    // than one queued item when the concurrency setting has been raised.
    while (this.runningDownloads.size < this.maxConcurrent && this.downloadQueue.length > 0) {
      const nextRequest = this.downloadQueue.shift();
      if (!nextRequest) break;
      this.runningDownloads.add(nextRequest.id);
      this.emit('progress', {
        id: nextRequest.id,
        url: nextRequest.url,
        title: nextRequest.title,
        thumbnail: nextRequest.thumbnail,
        percent: 0,
        speed: '0 MB/s',
        eta: '--:--',
        downloadedBytes: '0 MB',
        totalBytes: 'Starting...',
        status: 'downloading',
        startedAt: Date.now(),
        batchId: nextRequest.batchId,
        batchTitle: nextRequest.batchTitle,
        itemIndex: nextRequest.itemIndex,
      });
      this.executeDownload(nextRequest);
    }
  }

  public retryDownload(id: string): boolean {
    const request = this.failedRequests.get(id);
    if (request) {
      this.failedRequests.delete(id);
      this.startDownload(request);
      return true;
    }
    return false;
  }

  public retryAllFailed(): number {
    const failedList = Array.from(this.failedRequests.values());
    this.failedRequests.clear();
    for (const req of failedList) {
      this.startDownload(req);
    }
    return failedList.length;
  }

  private extractVideoId(url: string): string | null {
    const patterns = [
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/,
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m) return m[1];
    }
    return null;
  }

  private sanitizeErrorMessage(rawError: string): string {
    if (!rawError) return 'Download failed';
    if (
      rawError.includes('nodename nor servname provided') ||
      rawError.includes('getaddrinfo failed') ||
      rawError.includes('Temporary failure in name resolution') ||
      rawError.includes('Errno 8')
    ) {
      return 'Network / DNS connection timed out. Please check your internet connection and click Retry.';
    }
    if (rawError.includes('The read operation timed out') || rawError.includes('timed out')) {
      return 'Connection timed out while streaming from YouTube. Click Retry.';
    }
    if (rawError.includes('Video unavailable') || rawError.includes('This video is not available')) {
      return 'This video is unavailable or restricted by YouTube.';
    }
    if (rawError.includes('No space left on device') || rawError.includes('Errno 28')) {
      return 'Hard drive is full (No space left on device). Please free up disk space or change download folder in Settings.';
    }
    if (rawError.includes('Private video')) {
      return 'Skipped: This video is set to Private by the creator on YouTube.';
    }
    // ffmpeg missing is by far the most common postprocessing failure on a clean
    // Windows machine - keep it distinct from the out-of-disk-space case.
    if (
      rawError.includes('ffmpeg not found') ||
      rawError.includes('ffprobe and ffmpeg not found') ||
      rawError.includes('ffprobe/avprobe and ffmpeg/avconv not found') ||
      rawError.includes('You have requested merging of multiple formats but ffmpeg is not installed') ||
      rawError.includes('ffmpeg is not installed')
    ) {
      return 'Media converter (ffmpeg) is missing. NovaDownloader will install it automatically - click Retry in a moment.';
    }
    if (rawError.includes('Conversion failed') || rawError.includes('Unable to embed using ffprobe & ffmpeg')) {
      return 'Postprocessing error: failed to merge the audio and video streams.';
    }
    if (rawError.includes('Sign in to confirm your age')) {
      return 'Age-restricted video requiring YouTube sign-in.';
    }
    const errorLines = rawError.split('\n').filter((l) => l.trim().startsWith('ERROR:'));
    if (errorLines.length > 0) {
      return errorLines[0].replace(/^ERROR:\s*/, '').trim();
    }
    const cleaned = rawError.replace(/WARNING:.*?\n/g, '').trim();
    return cleaned.length > 120 ? cleaned.slice(0, 120) + '...' : cleaned || 'Download failed';
  }

  private async executeDownload(request: DownloadRequest): Promise<void> {
    const ytDlp = await this.binaryManager.getYtDlpPath();

    // Already resolved (and installed if needed) in startDownload. When it is
    // still null the machine has no converter, so we fall back to formats that
    // need no merging rather than failing after a full download.
    const ffmpeg = await this.binaryManager.findFfmpeg();

    // Ignore relative paths from the renderer: they would resolve against the
    // process CWD (C:\Program Files\... on Windows) and fail EPERM on mkdir.
    const requestedFolder = request.outputPath || this.store.getSettings().downloadFolder;
    const outputFolder =
      requestedFolder && path.isAbsolute(requestedFolder)
        ? requestedFolder
        : this.store.getSettings().downloadFolder;

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const outputTemplate = path.join(outputFolder, '%(title)s [%(id)s].%(ext)s');

    const args: string[] = [
      '--newline',
      '--no-playlist',
      '--socket-timeout',
      '20',
      '--no-check-certificates',
      '-N',
      '4',
      '--concurrent-fragments',
      '4',
      '--buffer-size',
      '64K',
      '--http-chunk-size',
      '10M',
      '--retries',
      '10',
      '--fragment-retries',
      '10',
      '--retry-sleep',
      '2',
      '--extractor-args',
      'youtube:player_client=android,web,ios',
      '--progress-template',
      'NOVAPROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_estimate_str)s|%(progress._downloaded_bytes_str)s',
      '-o',
      outputTemplate,
    ];

    if (ffmpeg) {
      args.push('--ffmpeg-location', ffmpeg);
    }

    if (request.formatType === 'audio') {
      if (ffmpeg) {
        const audioFormat = request.audioFormat || 'mp3';
        args.push('-x', '--audio-format', audioFormat, '--audio-quality', '0');
        if (request.embedThumbnail) {
          args.push('--embed-thumbnail');
        }
        args.push('--add-metadata');
      } else {
        // No converter available: keep the native audio stream (m4a/webm) so the
        // user still gets a playable file instead of a postprocessing failure.
        args.push('-f', 'bestaudio[ext=m4a]/bestaudio/best');
      }
    } else {
      // quality can arrive undefined from older callers, so normalise first.
      const quality = request.quality || 'best';
      const parsedHeight = quality.includes('p') ? parseInt(quality.replace(/\D/g, ''), 10) : NaN;
      const height = Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : null;

      if (ffmpeg) {
        if (height) {
          args.push(
            '-f',
            `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`,
            '--merge-output-format',
            'mp4'
          );
        } else {
          args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
        }

        if (request.embedThumbnail) {
          args.push('--embed-thumbnail');
        }
        if (request.embedSubtitles && request.subtitleLang) {
          args.push('--write-sub', '--sub-lang', request.subtitleLang, '--embed-subs');
        }
      } else {
        // Restrict to progressive (pre-muxed) streams, which need no merging.
        // Caps out at 720p on YouTube, but produces a working file every time.
        args.push(
          '-f',
          height
            ? `best[height<=${height}][acodec!=none][vcodec!=none]/best[height<=${height}]/best`
            : 'best[acodec!=none][vcodec!=none]/best'
        );
        if (request.embedSubtitles && request.subtitleLang) {
          // Cannot embed without ffmpeg; write a sidecar file instead.
          args.push('--write-sub', '--sub-lang', request.subtitleLang);
        }
      }
    }

    args.push(request.url);

    const progressObj: DownloadProgress = {
      id: request.id,
      url: request.url,
      title: request.title,
      thumbnail: request.thumbnail,
      percent: 0,
      speed: '0 MB/s',
      eta: '--:--',
      downloadedBytes: '0 MB',
      totalBytes: 'Calculating...',
      status: 'downloading',
      startedAt: Date.now(),
      batchId: request.batchId,
      batchTitle: request.batchTitle,
      itemIndex: request.itemIndex,
    };

    this.emit('progress', progressObj);

    const proc = spawn(ytDlp, args);
    this.activeProcesses.set(request.id, proc);

    let downloadedFilePath = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.includes('NOVAPROGRESS|')) {
          const parts = line.split('|');
          if (parts.length >= 6) {
            const rawPercent = parts[1].replace('%', '').trim();
            const percent = parseFloat(rawPercent) || 0;
            const speed = parts[2].trim() || '0 MB/s';
            const eta = parts[3].trim() || '--:--';
            const totalBytes = parts[4].trim() || 'Estimating';
            const downloadedBytes = parts[5].trim() || '';

            progressObj.percent = Math.min(Math.max(percent, 0), 100);
            progressObj.speed = speed;
            progressObj.eta = eta;
            progressObj.totalBytes = totalBytes;
            progressObj.downloadedBytes = downloadedBytes;
            progressObj.status = 'downloading';

            this.emit('progress', { ...progressObj });
          }
        } else if (line.includes('[Merger]') || line.includes('[ExtractAudio]') || line.includes('[Fixup')) {
          progressObj.status = 'processing';
          this.emit('progress', { ...progressObj });
        } else if (line.includes('Merging formats into "')) {
          const match = line.match(/Merging formats into "([^"]+)"/);
          if (match) {
            downloadedFilePath = match[1];
          }
        } else if (line.includes('has already been downloaded')) {
          const match = line.match(/\[download\]\s+(.*?)\s+has already been downloaded/);
          if (match && match[1]) {
            downloadedFilePath = match[1].trim();
          }
        }
      }
    });

    let stderrOutput = '';
    proc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    const cleanupAndNext = () => {
      this.activeProcesses.delete(request.id);
      this.runningDownloads.delete(request.id);
      this.processNextInQueue();
    };

    proc.on('close', (code) => {
      cleanupAndNext();

      if (this.cancelledIds.has(request.id)) {
        this.cancelledIds.delete(request.id);
        return;
      }

      if (code === 0) {
        this.failedRequests.delete(request.id);

        if (!downloadedFilePath || !fs.existsSync(downloadedFilePath)) {
          try {
            if (fs.existsSync(outputFolder)) {
              // Match on the video id, which the output template always embeds.
              // Matching loosely on extension picks a sibling's file during batch
              // downloads, so require the id and skip partial/fragment artifacts.
              const videoId = this.extractVideoId(request.url);
              const files = fs.readdirSync(outputFolder);
              const matching = files
                .filter((f) => {
                  if (/\.(part|ytdl|temp)$/i.test(f)) return false;
                  if (videoId) return f.includes(`[${videoId}]`);
                  return f.includes(request.title.slice(0, 20));
                })
                .map((f) => ({
                  name: f,
                  fullPath: path.join(outputFolder, f),
                  mtime: fs.statSync(path.join(outputFolder, f)).mtimeMs,
                }))
                .sort((a, b) => b.mtime - a.mtime);

              if (matching.length > 0) {
                downloadedFilePath = matching[0].fullPath;
              }
            }
          } catch {}
        }

        progressObj.percent = 100;
        progressObj.status = 'completed';
        progressObj.filePath = downloadedFilePath;
        progressObj.completedAt = Date.now();
        this.emit('progress', { ...progressObj });

        const historyItem: DownloadHistoryItem = {
          id: request.id,
          title: request.title,
          channel: request.channel || 'YouTube',
          thumbnail: request.thumbnail,
          completedAt: Date.now(),
          filePath: downloadedFilePath,
          fileSize: progressObj.totalBytes || 'Completed',
          formatType: request.formatType,
          quality: request.quality,
        };
        this.store.addHistoryItem(historyItem);
      } else if (progressObj.status !== 'cancelled') {
        this.failedRequests.set(request.id, request);
        progressObj.status = 'error';
        progressObj.error = this.sanitizeErrorMessage(stderrOutput || `Download failed with exit code ${code}`);
        this.emit('progress', { ...progressObj });
      }
    });

    proc.on('error', (err) => {
      cleanupAndNext();
      if (this.cancelledIds.has(request.id)) {
        this.cancelledIds.delete(request.id);
        return;
      }
      this.failedRequests.set(request.id, request);
      progressObj.status = 'error';
      progressObj.error = this.sanitizeErrorMessage(err.message);
      this.emit('progress', { ...progressObj });
    });
  }

  public cancelDownload(id: string): boolean {
    const queueIdx = this.downloadQueue.findIndex((r) => r.id === id);
    if (queueIdx !== -1) {
      this.downloadQueue.splice(queueIdx, 1);
      this.emit('progress', {
        id,
        percent: 0,
        status: 'cancelled',
        error: 'Download cancelled by user',
      });
      return true;
    }

    const proc = this.activeProcesses.get(id);
    if (proc) {
      // Mark first: the process' own 'close' handler runs right after the kill
      // and must not report this as a failure or free the slot a second time.
      this.cancelledIds.add(id);
      this.activeProcesses.delete(id);
      proc.kill('SIGTERM');
      this.emit('progress', {
        id,
        percent: 0,
        status: 'cancelled',
        error: 'Download cancelled by user',
      });
      return true;
    }
    return false;
  }
}
