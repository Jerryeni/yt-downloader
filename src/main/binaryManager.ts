import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import https from 'https';
import { BinaryStatus } from '../shared/types';

const execAsync = promisify(exec);

// Static builds used to self-heal a machine that has no system ffmpeg.
// Each platform lists one or more "sets"; a set is every archive that must be
// unpacked together (macOS publishes ffmpeg and ffprobe separately, Windows
// ships both in one zip). Sets are tried in order so a slow or unreachable
// mirror falls through to the next instead of stranding the user.
const FFMPEG_SOURCES: Record<string, string[][]> = {
  win32: [
    // GitHub-hosted mirror first: consistently faster and highly available.
    ['https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip'],
    // gyan.dev "essentials" build as a fallback.
    ['https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip'],
  ],
  darwin: [
    ['https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip', 'https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip'],
  ],
};

export class BinaryManager {
  private binDir: string;
  private ytDlpPath: string | null = null;
  private ffmpegPath: string | null = null;
  // A single in-flight install shared by every caller, so a batch of downloads
  // starting at once triggers one download instead of N competing ones.
  private ffmpegInstallPromise: Promise<string | null> | null = null;

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

  /**
   * Locate ffmpeg without touching the network. Returns null when nothing is installed.
   */
  public async findFfmpeg(): Promise<string | null> {
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

    const candidatePaths = isWin
      ? [
          'C:\\ffmpeg\\bin\\ffmpeg.exe',
          'C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe',
          path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe'),
          path.join(process.env.ProgramData || '', 'chocolatey', 'bin', 'ffmpeg.exe'),
        ].filter(Boolean)
      : [
          '/opt/homebrew/bin/ffmpeg',
          '/usr/local/bin/ffmpeg',
          '/usr/bin/ffmpeg',
        ];

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
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

  /**
   * Locate ffmpeg, downloading a static build into the app's bin folder when the
   * machine has none. Merging/extraction silently breaks without it, so we treat
   * it as a required runtime dependency rather than an optional nicety.
   */
  public async getFfmpegPath(autoInstall = true): Promise<string | null> {
    const found = await this.findFfmpeg();
    if (found) return found;
    if (!autoInstall) return null;

    if (!this.ffmpegInstallPromise) {
      this.ffmpegInstallPromise = this.installFfmpeg()
        .catch((err) => {
          console.error('ffmpeg auto-install failed:', err);
          return null;
        })
        .finally(() => {
          this.ffmpegInstallPromise = null;
        }) as Promise<string | null>;
    }

    return this.ffmpegInstallPromise;
  }

  public isFfmpegInstalling(): boolean {
    return this.ffmpegInstallPromise !== null;
  }

  /**
   * Download + unpack a static ffmpeg (and ffprobe) build into binDir.
   */
  public async installFfmpeg(): Promise<string | null> {
    const platform = process.platform;
    const sourceSets = FFMPEG_SOURCES[platform];
    if (!sourceSets || sourceSets.length === 0) {
      // Linux: rely on the distro package manager rather than shipping a build.
      return null;
    }

    let lastError: Error | null = null;
    for (const urls of sourceSets) {
      try {
        const installed = await this.installFfmpegFrom(urls);
        if (installed) return installed;
      } catch (err: any) {
        lastError = err;
        console.error(`ffmpeg source failed (${urls[0]}):`, err?.message || err);
      }
    }

    if (lastError) throw lastError;
    return null;
  }

  private async installFfmpegFrom(urls: string[]): Promise<string | null> {
    const isWin = process.platform === 'win32';
    const tmpDir = path.join(this.binDir, `.ffmpeg-tmp-${Date.now()}`);

    fs.mkdirSync(tmpDir, { recursive: true });

    try {
      for (let i = 0; i < urls.length; i++) {
        const archivePath = path.join(tmpDir, `ffmpeg-archive-${i}.zip`);
        console.log(`Downloading ffmpeg component from ${urls[i]}...`);
        await this.downloadFileWithRedirects(urls[i], archivePath);
        await this.extractArchive(archivePath, tmpDir);
      }

      const wanted = isWin ? ['ffmpeg.exe', 'ffprobe.exe'] : ['ffmpeg', 'ffprobe'];
      let mainBinary: string | null = null;

      for (const name of wanted) {
        const src = this.findFileRecursive(tmpDir, name);
        if (!src) continue;
        const dest = path.join(this.binDir, name);
        fs.copyFileSync(src, dest);
        if (!isWin) {
          fs.chmodSync(dest, 0o755);
          try {
            await execAsync(`xattr -d com.apple.quarantine "${dest}" 2>/dev/null || true`);
          } catch {
            // ignore
          }
        }
        if (name.startsWith('ffmpeg')) {
          mainBinary = dest;
        }
      }

      if (!mainBinary) {
        throw new Error('ffmpeg binary not found inside downloaded archive');
      }

      // A truncated download can still unpack into a file-shaped result, so
      // confirm the binary actually runs before we start depending on it.
      try {
        await execAsync(`"${mainBinary}" -version`, { timeout: 20000 });
      } catch (err: any) {
        try {
          fs.unlinkSync(mainBinary);
        } catch {
          // ignore
        }
        throw new Error(`Downloaded ffmpeg is not runnable: ${err?.message || err}`);
      }

      this.ffmpegPath = mainBinary;
      console.log(`ffmpeg installed at ${mainBinary}`);
      return mainBinary;
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }

  /**
   * Unpack a zip using tools already present on the OS, so we add no dependency.
   */
  private async extractArchive(archivePath: string, destDir: string): Promise<void> {
    if (process.platform === 'win32') {
      // tar.exe (bsdtar) ships with Windows 10 1803+ and handles zip.
      try {
        await execAsync(`tar -xf "${archivePath}" -C "${destDir}"`, { maxBuffer: 1024 * 1024 * 32 });
        return;
      } catch {
        // Fall back to PowerShell's Expand-Archive on older builds.
      }
      const ps = `powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath '${archivePath}' -DestinationPath '${destDir}' -Force"`;
      await execAsync(ps, { maxBuffer: 1024 * 1024 * 32 });
      return;
    }

    await execAsync(`unzip -o "${archivePath}" -d "${destDir}"`, { maxBuffer: 1024 * 1024 * 32 });
  }

  private findFileRecursive(dir: string, fileName: string, depth = 0): string | null {
    if (depth > 6) return null;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
        return full;
      }
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const found = this.findFileRecursive(path.join(dir, entry.name), fileName, depth + 1);
        if (found) return found;
      }
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
      // Status checks must not kick off a multi-megabyte download as a side effect.
      const ffmpeg = await this.findFfmpeg();
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

    if (!status.ffmpeg.available) {
      status.ffmpeg.installing = this.isFfmpegInstalling();
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
