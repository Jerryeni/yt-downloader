import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
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

// Locate yt-dlp
async function getYtDlp(): Promise<string> {
  const possiblePaths = [
    path.join(process.env.HOME || '', 'Library/Application Support/nova-downloader/bin/yt-dlp'),
    path.join(__dirname, '../../bin/yt-dlp'),
    '/usr/local/bin/yt-dlp',
    '/opt/homebrew/bin/yt-dlp',
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  try {
    const { stdout } = await execAsync('which yt-dlp');
    if (stdout.trim()) return stdout.trim();
  } catch {}

  return 'yt-dlp';
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

// In-App Search Endpoint
app.get('/api/search', async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.status(400).json({ error: 'Search query is required' });

  try {
    const ytDlp = await getYtDlp();
    const args = [
      `ytsearch8:${query}`,
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
        return res.status(500).json({ error: stderr || 'Search failed' });
      }

      try {
        const raw = JSON.parse(stdout);
        const entries = (raw.entries || []).map((e: any) => ({
          id: e.id,
          url: e.url || `https://www.youtube.com/watch?v=${e.id}`,
          title: e.title || 'Untitled',
          uploader: e.uploader || e.channel || 'YouTube Creator',
          durationFormatted: formatDuration(e.duration || 0),
          thumbnail: e.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${e.id}/mqdefault.jpg`,
          viewCount: e.view_count,
        }));
        res.json({ results: entries });
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
  console.log(`NovaDownloader Web & PWA Server running at http://localhost:${PORT}`);
});
