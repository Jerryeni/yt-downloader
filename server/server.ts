import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import archiver from 'archiver';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve PWA and static client assets
const clientDist = path.join(__dirname, '../renderer');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// Locate yt-dlp across macOS, Windows, and Linux
async function getYtDlp(): Promise<string> {
  const possiblePaths = [
    path.join(process.env.APPDATA || '', 'nova-downloader/bin/yt-dlp.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs/yt-dlp/yt-dlp.exe'),
    path.join(__dirname, '../../bin/yt-dlp.exe'),
    path.join(__dirname, '../../bin/yt-dlp'),
    path.join(process.env.HOME || '', 'Library/Application Support/nova-downloader/bin/yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) return p;
  }

  try {
    const whichCmd = process.platform === 'win32' ? 'where yt-dlp' : 'which yt-dlp';
    const { stdout } = await execAsync(whichCmd);
    if (stdout.trim()) return stdout.trim().split(/\r?\n/)[0];
  } catch {}

  return process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`;
  return `${pad(mins)}:${pad(secs)}`;
}

// In-App Search Endpoint with Filters and Pagination
app.get('/api/search', async (req, res) => {
  const query = (req.query.q as string || '').trim();
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  const page = Number(req.query.page) || 1;
  const pageSize = Number(req.query.pageSize) || 16;
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = page * pageSize;
  const filterType = req.query.filterType as string;
  const duration = req.query.duration as string;
  const sortBy = req.query.sortBy as string;

  try {
    const ytDlp = await getYtDlp();
    let searchTarget = '';
    if (filterType === 'playlist') {
      searchTarget = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAw%253D%253D`;
    } else {
      let spParam = '';
      if (duration === 'short') spParam = 'EgQQARgB';
      else if (duration === 'medium') spParam = 'EgQQARgD';
      else if (duration === 'long') spParam = 'EgQQARgC';
      else if (sortBy === 'date') spParam = 'CAI%253D';
      else if (sortBy === 'views') spParam = 'CAM%253D';
      else if (filterType === 'video') spParam = 'EgIQAQ%253D%253D';

      if (spParam) {
        searchTarget = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=${spParam}`;
      } else {
        searchTarget = `ytsearch${endIdx + 8}:${query}`;
      }
    }

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
        return res.status(500).json({ error: stderr || 'Search failed' });
      }

      try {
        const raw = JSON.parse(stdout);
        const entries: any[] = raw.entries || [];
        const results = entries.map((e: any) => {
          const isPlaylist =
            filterType === 'playlist' ||
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
            itemCount: e.playlist_count || undefined,
          };
        });

        res.json({
          results,
          hasMore: entries.length >= pageSize,
          page,
        });
      } catch (err: any) {
        res.status(500).json({ error: 'Failed to parse search results' });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Analyze Video or Playlist
app.post('/api/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const ytDlp = await getYtDlp();
    const isPlaylist = url.includes('list=') && !url.includes('watch?v=');

    const args = isPlaylist
      ? [
          url,
          '--dump-single-json',
          '--flat-playlist',
          '--no-warnings',
          '--skip-download',
          '--extractor-args',
          'youtube:player_client=android,web',
        ]
      : [
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

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: stderr || 'Analysis failed' });
      }

      try {
        const raw = JSON.parse(stdout);

        if (isPlaylist || raw._type === 'playlist') {
          const items = (raw.entries || []).map((e: any, idx: number) => ({
            id: e.id,
            url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
            title: e.title || `Track #${idx + 1}`,
            durationFormatted: formatDuration(e.duration || 0),
            thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
            index: idx + 1,
          }));

          return res.json({
            isPlaylist: true,
            playlist: {
              id: raw.id,
              title: raw.title,
              uploader: raw.uploader || 'YouTube',
              itemCount: items.length,
              items,
            },
          });
        }

        // Single video
        const rawFormats: any[] = raw.formats || [];
        const videoFormatsMap = new Map<string, any>();
        const audioFormats: any[] = [];

        for (const f of rawFormats) {
          const isAudio = f.vcodec === 'none' && f.acodec !== 'none';
          const isVideo = f.vcodec !== 'none';

          if (isAudio) {
            audioFormats.push({
              formatId: f.format_id,
              formatNote: f.format_note || f.ext,
              ext: f.ext,
              qualityRank: f.abr || 128,
            });
          } else if (isVideo && f.height) {
            const resKey = `${f.height}p`;
            const existing = videoFormatsMap.get(resKey);
            if (!existing || (f.fps && f.fps > (existing.fps || 30))) {
              videoFormatsMap.set(resKey, {
                formatId: f.format_id,
                resolution: `${f.height}p${f.fps && f.fps > 30 ? f.fps : ''}`,
                ext: 'mp4',
                fps: f.fps,
                qualityRank: f.height,
              });
            }
          }
        }

        const videoFormats = Array.from(videoFormatsMap.values()).sort(
          (a, b) => b.qualityRank - a.qualityRank
        );

        res.json({
          isPlaylist: false,
          metadata: {
            id: raw.id,
            url,
            title: raw.title || 'Untitled',
            uploader: raw.uploader || raw.channel || 'Creator',
            duration: raw.duration || 0,
            durationFormatted: formatDuration(raw.duration || 0),
            viewCount: raw.view_count || 0,
            thumbnail: raw.thumbnail || '',
            videoFormats,
            audioFormats,
            subtitles: [],
          },
        });
      } catch (err: any) {
        res.status(500).json({ error: 'Failed to parse video info' });
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Mobile & Web Direct Streaming Download Endpoint
app.get('/api/download', async (req, res) => {
  const { url, type, quality, title } = req.query as {
    url: string;
    type?: string;
    quality?: string;
    title?: string;
  };

  if (!url) return res.status(400).send('URL is required');

  try {
    const ytDlp = await getYtDlp();
    const isAudio = type === 'audio';
    const ext = isAudio ? 'mp3' : 'mp4';
    const cleanTitle = (title || 'video').replace(/[/\\?%*:|"<>]/g, '_');
    const filename = `${cleanTitle}.${ext}`;

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', isAudio ? 'audio/mpeg' : 'video/mp4');

    const args: string[] = [
      '-N', '8',
      '--concurrent-fragments', '8',
      '--buffer-size', '64K',
      '--no-playlist',
      '--extractor-args', 'youtube:player_client=android,web',
      '--js-runtimes', 'node',
      '-o', '-', // Stream to stdout!
    ];

    if (isAudio) {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      if (quality && quality.includes('p')) {
        const height = parseInt(quality.replace(/\D/g, ''), 10);
        args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
      } else {
        args.push('-f', 'bestvideo+bestaudio/best');
      }
    }

    args.push(url);

    const proc = spawn(ytDlp, args);
    proc.stdout.pipe(res);

    proc.stderr.on('data', (d) => {
      // debug progress
    });

    req.on('close', () => {
      proc.kill('SIGTERM');
    });
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(500).send(`Failed to stream download: ${err.message}`);
    }
  }
});

// Web / Mobile Batch ZIP Creation & Streaming Endpoint
app.post('/api/create-zip', async (req, res) => {
  const { archiveName, items } = req.body as {
    archiveName?: string;
    items?: Array<{ url: string; title: string; formatType?: 'video' | 'audio'; quality?: string; index?: number }>;
  };

  if (!items || items.length === 0) {
    return res.status(400).json({ error: 'No items provided for zip archive' });
  }

  const cleanArchiveName = (archiveName || 'batch_downloads')
    .replace(/[<>:"/\\|?*]/g, '_')
    .trim();
  const zipFilename = cleanArchiveName.endsWith('.zip') ? cleanArchiveName : `${cleanArchiveName}.zip`;

  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(zipFilename)}"`);
  res.setHeader('Content-Type', 'application/zip');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  archive.on('error', (err: any) => {
    console.error('Archiver streaming error:', err);
    if (!res.headersSent) res.status(500).send(err.message);
  });

  try {
    const ytDlp = await getYtDlp();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const isAudio = item.formatType === 'audio';
      const ext = isAudio ? 'mp3' : 'mp4';
      const indexStr = item.index !== undefined ? `${String(item.index).padStart(2, '0')}. ` : `${String(i + 1).padStart(2, '0')}. `;
      const safeTitle = (item.title || `Track_${i + 1}`).replace(/[<>:"/\\|?*]/g, '_').trim();
      const entryName = `${indexStr}${safeTitle}.${ext}`;

      const args = [
        '-N', '8',
        '--concurrent-fragments', '8',
        '--buffer-size', '64K',
        '--no-playlist',
        '--extractor-args', 'youtube:player_client=android,web',
        '--js-runtimes', 'node',
        '-o', '-',
      ];

      if (isAudio) {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
      } else {
        const quality = item.quality || '1080p';
        if (quality && quality.includes('p')) {
          const height = parseInt(quality.replace(/\D/g, ''), 10);
          args.push('-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`);
        } else {
          args.push('-f', 'bestvideo+bestaudio/best');
        }
      }

      args.push(item.url);

      const itemProc = spawn(ytDlp, args);
      archive.append(itemProc.stdout, { name: entryName });

      await new Promise<void>((next) => {
        itemProc.stdout.on('end', () => next());
        itemProc.on('error', () => next());
      });
    }

    archive.finalize();
  } catch (err: any) {
    console.error('Failed to create batch zip on web server:', err);
    archive.abort();
  }
});

// Serve frontend for all remaining routes
app.use((_req, res) => {
  const indexHtml = path.join(clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.send('NovaDownloader Web Server is active. Build the client with "npm run build".');
  }
});

app.listen(PORT, () => {
  const nets = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`⚡ NovaDownloader Web & PWA Server v1.0.1 Ready!`);
  console.log(`💻 Local access:   http://localhost:${PORT}`);
  if (addresses.length > 0) {
    addresses.forEach((ip) => {
      console.log(`📱 Mobile (LAN):   http://${ip}:${PORT}`);
    });
    console.log(`   (Open on iPhone/Android & tap "Add to Home Screen")`);
  }
  console.log(`======================================================\n`);
});
