import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { BinaryStatus } from '../shared/types';

const execAsync = promisify(exec);

export class BinaryManager {
  private binDir: string;
  private ytDlpPath: string | null = null;
  private ffmpegPath: string | null = null;

  constructor() {
    // Store binaries in app's userData directory
    const userData = app.getPath('userData');
    this.binDir = path.join(userData, 'bin');
    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }
  }

  public getBinDir(): string {
    return this.binDir;
  }

  public async getYtDlpPath(): Promise<string> {
    if (this.ytDlpPath && fs.existsSync(this.ytDlpPath)) {
      return this.ytDlpPath;
    }

    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const localPath = path.join(this.binDir, binaryName);

    // 1. Check local bin
    if (fs.existsSync(localPath)) {
      this.ytDlpPath = localPath;
      return localPath;
    }

    // 2. Check system PATH
    try {
      const checkCmd = isWin ? 'where yt-dlp' : 'which yt-dlp';
      const { stdout } = await execAsync(checkCmd);
      const systemPath = stdout.trim().split('\n')[0].trim();
      if (systemPath && fs.existsSync(systemPath)) {
        this.ytDlpPath = systemPath;
        return systemPath;
      }
    } catch {
      // not in system path
    }

    // 3. Fallback to bundled or auto-download
    await this.downloadYtDlp();
    this.ytDlpPath = localPath;
    return localPath;
  }

  public async getFfmpegPath(): Promise<string | null> {
    if (this.ffmpegPath && fs.existsSync(this.ffmpegPath)) {
      return this.ffmpegPath;
    }

    const isWin = process.platform === 'win32';
    const binaryName = isWin ? 'ffmpeg.exe' : 'ffmpeg';
    const localPath = path.join(this.binDir, binaryName);

    if (fs.existsSync(localPath)) {
      this.ffmpegPath = localPath;
      return localPath;
    }

    // Common macOS Homebrew and standard UNIX paths
    const candidatePaths = isWin
      ? ['C:\\ffmpeg\\bin\\ffmpeg.exe', 'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe']
      : [
          '/opt/homebrew/bin/ffmpeg',
          '/usr/local/bin/ffmpeg',
          '/usr/bin/ffmpeg',
        ];

    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        this.ffmpegPath = p;
        return p;
      }
    }

    // Check system PATH
    try {
      const checkCmd = isWin ? 'where ffmpeg' : 'which ffmpeg';
      const { stdout } = await execAsync(checkCmd);
      const systemPath = stdout.trim().split('\n')[0].trim();
      if (systemPath && fs.existsSync(systemPath)) {
        this.ffmpegPath = systemPath;
        return systemPath;
      }
    } catch {
      // not found
    }

    return null;
  }

  public async getStatus(): Promise<BinaryStatus> {
    const status: BinaryStatus = {
      ytdlp: { available: false },
      ffmpeg: { available: false },
    };

    try {
      const ytdlp = await this.getYtDlpPath();
      if (fs.existsSync(ytdlp)) {
        const { stdout } = await execAsync(`"${ytdlp}" --version`);
        status.ytdlp = {
          available: true,
          version: stdout.trim(),
          path: ytdlp,
        };
      }
    } catch (e: any) {
      status.ytdlp = { available: false, version: undefined };
    }

    try {
      const ffmpeg = await this.getFfmpegPath();
      if (ffmpeg && fs.existsSync(ffmpeg)) {
        const { stdout } = await execAsync(`"${ffmpeg}" -version`);
        const firstLine = stdout.split('\n')[0];
        const match = firstLine.match(/version\s+([^\s]+)/i);
        status.ffmpeg = {
          available: true,
          version: match ? match[1] : 'installed',
          path: ffmpeg,
        };
      }
    } catch (e: any) {
      status.ffmpeg = { available: false };
    }

    return status;
  }

  public async downloadYtDlp(): Promise<string> {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    
    // Choose appropriate release asset
    let downloadUrl: string;
    const destName = isWin ? 'yt-dlp.exe' : 'yt-dlp';
    const destPath = path.join(this.binDir, destName);

    if (isWin) {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';
    } else if (isMac) {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    } else {
      downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    }

    console.log(`Downloading yt-dlp from ${downloadUrl} to ${destPath}...`);

    await this.downloadFileWithRedirects(downloadUrl, destPath);

    if (!isWin) {
      fs.chmodSync(destPath, 0o755);
      try {
        await execAsync(`xattr -d com.apple.quarantine "${destPath}" 2>/dev/null || true`);
      } catch {
        // ignore
      }
    }

    this.ytDlpPath = destPath;
    return destPath;
  }

  public async updateYtDlp(): Promise<{ success: boolean; message: string; version?: string }> {
    try {
      const currentPath = await this.getYtDlpPath();
      // Try yt-dlp -U first
      try {
        const { stdout } = await execAsync(`"${currentPath}" -U`);
        const versionCheck = await execAsync(`"${currentPath}" --version`);
        return {
          success: true,
          message: stdout.trim() || 'yt-dlp updated successfully',
          version: versionCheck.stdout.trim(),
        };
      } catch (err: any) {
        // If -U fails (permissions or package type), redownload directly
        await this.downloadYtDlp();
        const versionCheck = await execAsync(`"${this.ytDlpPath}" --version`);
        return {
          success: true,
          message: 'Downloaded latest official yt-dlp release',
          version: versionCheck.stdout.trim(),
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to update yt-dlp',
      };
    }
  }

  private downloadFileWithRedirects(url: string, destPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = (currentUrl: string, redirectCount = 0) => {
        if (redirectCount > 10) {
          return reject(new Error('Too many redirects while downloading binary'));
        }

        https.get(currentUrl, (response) => {
          if (
            response.statusCode &&
            response.statusCode >= 300 &&
            response.statusCode < 400 &&
            response.headers.location
          ) {
            return request(response.headers.location, redirectCount + 1);
          }

          if (response.statusCode !== 200) {
            return reject(new Error(`Failed to download binary: HTTP ${response.statusCode}`));
          }

          const fileStream = fs.createWriteStream(destPath);
          response.pipe(fileStream);

          fileStream.on('finish', () => {
            fileStream.close(() => resolve());
          });

          fileStream.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
          });
        }).on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      };

      request(url);
    });
  }
}
