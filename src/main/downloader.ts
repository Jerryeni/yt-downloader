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

  constructor(binaryManager: BinaryManager, store: AppStore) {
    super();
    this.binaryManager = binaryManager;
    this.store = store;
  }

  /**
   * Fast In-App YouTube Search
   */
  public async searchVideos(query: string, limit = 8): Promise<SearchResultItem[]> {
    const ytDlp = await this.binaryManager.getYtDlpPath();

    return new Promise((resolve, reject) => {
      const args = [
        `ytsearch${limit}:${query}`,
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
          return reject(new Error(stderr || `Search failed with code ${code}`));
        }

        try {
          const raw = JSON.parse(stdout);
          const entries: any[] = raw.entries || [];
          const results: SearchResultItem[] = entries.map((e) => ({
            id: e.id,
            url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
            title: e.title || 'Untitled',
            uploader: e.uploader || e.channel || 'YouTube Creator',
            durationFormatted: formatDuration(e.duration || 0),
            thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
            viewCount: e.view_count,
          }));
          resolve(results);
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
   * Ultra-Fast Multi-Threaded Download Engine
   */
  public async startDownload(request: DownloadRequest): Promise<void> {
    const ytDlp = await this.binaryManager.getYtDlpPath();
    const ffmpeg = await this.binaryManager.getFfmpegPath();

    const outputFolder = request.outputPath || this.store.getSettings().downloadFolder;
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const outputTemplate = path.join(outputFolder, '%(title)s [%(id)s].%(ext)s');

    const args: string[] = [
      '--newline',
      '--no-playlist',
      // High speed multi-threading: 8 parallel fragment downloads!
      '-N',
      '8',
      '--concurrent-fragments',
      '8',
      '--buffer-size',
      '64K',
      '--http-chunk-size',
      '10M',
      '--retries',
      '10',
      '--fragment-retries',
      '10',
      '--extractor-args',
      'youtube:player_client=android,web',
      '--js-runtimes',
      'node',
      '--progress-template',
      'NOVAPROGRESS|%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s|%(progress._total_bytes_estimate_str)s|%(progress._downloaded_bytes_str)s',
      '-o',
      outputTemplate,
    ];

    if (ffmpeg) {
      args.push('--ffmpeg-location', ffmpeg);
    }

    // Format selection
    if (request.formatType === 'audio') {
      const audioFormat = request.audioFormat || 'mp3';
      args.push('-x', '--audio-format', audioFormat, '--audio-quality', '0');
      if (request.embedThumbnail) {
        args.push('--embed-thumbnail');
      }
      args.push('--add-metadata');
    } else {
      // Video format selection with audio remux
      if (request.quality === 'best') {
        args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
      } else if (request.quality.includes('p')) {
        const height = parseInt(request.quality.replace(/\D/g, ''), 10);
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
        } else if (line.includes('[download] Destination:')) {
          downloadedFilePath = line.replace('[download] Destination:', '').trim();
        } else if (line.includes('[Merger] Merging formats into')) {
          const match = line.match(/Merging formats into "([^"]+)"/);
          if (match) {
            downloadedFilePath = match[1];
          }
        }
      }
    });

    let stderrOutput = '';
    proc.stderr.on('data', (data) => {
      stderrOutput += data.toString();
    });

    proc.on('close', (code) => {
      this.activeProcesses.delete(request.id);

      if (code === 0) {
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
        progressObj.status = 'error';
        progressObj.error = stderrOutput || `Download failed with exit code ${code}`;
        this.emit('progress', { ...progressObj });
      }
    });

    proc.on('error', (err) => {
      this.activeProcesses.delete(request.id);
      progressObj.status = 'error';
      progressObj.error = err.message;
      this.emit('progress', { ...progressObj });
    });
  }

  public cancelDownload(id: string): boolean {
    const proc = this.activeProcesses.get(id);
    if (proc) {
      proc.kill('SIGTERM');
      this.activeProcesses.delete(id);
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
