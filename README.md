# ⚡ NovaDownloader

<div align="center">

<h1>NovaDownloader</h1>
<p><strong>The ultimate high-speed, professional video & audio downloader for macOS, Windows, and Web.</strong></p>
<p>Powered by <code>yt-dlp</code> and <code>ffmpeg</code> with multi-threaded chunking, in-app YouTube discovery, smart playlist batch downloading, and automated ZIP packaging.</p>

[![Release](https://img.shields.io/github/v/release/Jerryeni/yt-downloader?style=for-the-badge&color=2563eb)](https://github.com/Jerryeni/yt-downloader/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Web%20PWA-0284c7?style=for-the-badge)](https://github.com/Jerryeni/yt-downloader/releases/latest)
[![Architecture](https://img.shields.io/badge/Arch-Apple%20Silicon%20(M1--M4)%20%7C%20Intel%20%7C%20x64-6366f1?style=for-the-badge)](https://github.com/Jerryeni/yt-downloader/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)

</div>

---

## 🚀 Download Pre-Built Binaries (v1.0.4)

Get the latest release ready-to-use for your computer:

| Operating System | Architecture | Package Format | Direct Download Link |
| :--- | :--- | :--- | :--- |
| **Windows** (10 / 11) | **64-bit** (x64) | **Setup Installer (`.exe`)** | [⬇️ **Download Windows Setup Installer (.exe)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-Setup-1.0.4-x64.exe) |
| **Windows** (10 / 11) | **64-bit** (x64) | **Portable Standalone (`.exe`)** | [⬇️ **Download Windows Portable (.exe)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-Portable-1.0.4-x64.exe) |
| **macOS** (11.0+) | **Apple Silicon** (M1 / M2 / M3 / M4) | **Apple Disk Image (`.dmg`)** | [⬇️ **Download macOS Apple Silicon (.dmg)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-1.0.4-mac-arm64.dmg) |
| **macOS** (11.0+) | **Apple Silicon** (M1 / M2 / M3 / M4) | **Portable Archive (`.zip`)** | [⬇️ **Download macOS Apple Silicon (.zip)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-1.0.4-mac-arm64.zip) |
| **macOS** (11.0+) | **Intel** (x64) | **Apple Disk Image (`.dmg`)** | [⬇️ **Download macOS Intel (.dmg)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-1.0.4-mac-x64.dmg) |
| **macOS** (11.0+) | **Intel** (x64) | **Portable Archive (`.zip`)** | [⬇️ **Download macOS Intel (.zip)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-1.0.4-mac-x64.zip) |
| **Web & Mobile** | **iOS Safari / Android / Browser** | **PWA Web Bundle (`.zip`)** | [⬇️ **Download Web Server & PWA Package (.zip)**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-Web-PWA.zip) |

👉 **All Assets & Releases**: [View All Releases on GitHub](https://github.com/Jerryeni/yt-downloader/releases)

> [!TIP]
> **macOS First-Launch Note**: Since open-source community releases are not notarized through Apple's paid developer program, if macOS displays a *"cannot be opened because it is from an unidentified developer"* notice:
> - Simply right-click (or Control-click) `NovaDownloader.app` in `/Applications` and select **Open** > **Open**.
> - Or run once in Terminal: `xattr -cr /Applications/NovaDownloader.app`

---

## 🌟 Key Features

### 🔍 1. In-App YouTube Search & Discovery
- **Search Without Leaving the App**: Search for songs, albums, creators, podcasts, or full playlists directly inside NovaDownloader.
- **Smart Filters**:
  - **Type Filter**: Filter by `All`, `Playlists Only`, or `Videos Only`.
  - **Duration Filter**: Filter videos by length (`< 4 min`, `4–20 min`, `> 20 min`).
  - **Sort Order**: Sort by `Relevance`, `Upload Date` (Newest), or `View Count` (Most Popular).
- **Infinite Scrolling & Pagination**: Smoothly scrolls and loads batches of 16 items continuously with automatic deduplication.

### 📦 2. 1-Click Playlist Batch Downloader & Automated ZIP Archiving
- **Full Playlist Track Inspector**: Preview all tracks in a playlist with thumbnails, titles, and runtimes.
- **Selective or Batch Download**: Pick individual songs or use **Select All** to download dozens of tracks in 1080p MP4 or 320kbps MP3.
- **Automated Post-Batch ZIP Prompt**:
  - Once your batch or playlist download completes, NovaDownloader automatically asks:
    > *"Batch download completed! (X items downloaded). Would you like to package these files into a clean ZIP archive?"*
  - **Proper Title Sanitization**: Strips YouTube clutter (`[Official Music Video]`, `(Lyrics)`, `[4K 60FPS]`, `(HD Audio)`, `| HQ`, etc.) and formats files with clean 2-digit track numbers (e.g. `01. Artist - Track Name.mp3`).
  - **Clean File Names**: Replaces characters illegal on Windows/macOS (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) with clean hyphens.
  - **Direct Actions**: Open the archive directly with 1 click via **"Show in Folder"** (Finder on macOS, Explorer on Windows).

### ⚡ 3. Multi-Threaded High-Speed Engine
- **8-Way Concurrent Fragments (`-N 8`)**: Bypasses YouTube's single-stream throttling to achieve maximum line speed (20–50+ MB/s).
- **Sub-Second Extraction**: Optimized player client routing (`android,web`) extracts full video and format metadata in under 1.5 seconds.
- **Up to 4K / 8K Video**: Download 4K 2160p 60fps, 1440p, 1080p Full HD, or 720p HD.
- **Hi-Fi Audio Extraction**: Extract audio to MP3 (320kbps), M4A (AAC), FLAC (lossless), or WAV.

### 🎨 4. Solid-Color, High-Contrast UI/UX (Light & Dark Mode)
- **Zero AI Clichés**: Built with solid surfaces (`#ffffff` light, `#0b0f17` dark), crisp borders, and accessible contrast.
- **Instant Theme Switching**: Seamlessly toggle between Dark Mode and Light Mode anytime.
- **Apple Segmented Navigation**: Intuitive tab navigation between Single Download, Search, Batch Queue, and History.
- **Live Transfer Telemetry**: Live progress bars with speed in `MB/s`, `ETA`, and transferred bytes.

### 📱 5. Companion Web & Mobile PWA Mode
- **Express Streaming Server**: Run NovaDownloader as a standalone web server accessible on your local network or phone.
- **Mobile-Friendly**: Allows mobile users on iOS Safari and Android Chrome to stream downloads or download full batches as a single ZIP without popup blockers.
- **PWA Installable**: Add NovaDownloader directly to your phone's home screen.

---

## 💻 Getting Started (Development & Building)

### Prerequisites
- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **Python 3**: Native python3 installed on your machine (used by `yt-dlp`)
- **FFmpeg**: (Optional) Detected from your system PATH, Homebrew, or common install
  locations. If it is missing, the app downloads a static build into its own data
  folder on first launch, so HD merging and MP3 conversion work out of the box.
  While it is unavailable the app falls back to single-file (pre-muxed) streams,
  which stay playable but cap video at 720p. On Linux, install it with your package
  manager (e.g. `sudo apt install ffmpeg`).

### 1. Clone the Repository
```bash
git clone https://github.com/Jerryeni/yt-downloader.git
cd yt-downloader
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Desktop App in Development Mode
```bash
npm run dev
```
*Starts Vite with hot-module replacement and launches the Electron desktop application.*

---

## 🌐 Mobile (iPhone, iPad, Android) & Web PWA Mode

NovaDownloader can be accessed from any mobile browser or installed as a Progressive Web App (PWA) on iPhone, iPad, and Android devices:

### Quickstart with Downloaded Web Bundle:
1. Download [**NovaDownloader-Web-PWA.zip**](https://github.com/Jerryeni/yt-downloader/releases/download/v1.0.4/NovaDownloader-Web-PWA.zip) and unzip it.
2. Run:
   ```bash
   npm install --omit=dev
   node dist/server/server.js
   ```
3. The console will display your local network IP:
   ```text
   ⚡ NovaDownloader Web & PWA Server v1.0.1 Ready!
   💻 Local access:   http://localhost:3000
   📱 Mobile (LAN):   http://192.168.1.15:3000
   ```

### 📱 Installing on Apple Mobile (iPhone / iPad):
1. On your iPhone or iPad, open Safari and navigate to `http://<your-computer-ip>:3000`.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **"Add to Home Screen"**.
4. Confirm by tapping **Add**. NovaDownloader will appear on your iOS home screen as a standalone, full-screen app!

### 🤖 Installing on Android:
1. On your Android phone or tablet, open Chrome and visit `http://<your-computer-ip>:3000`.
2. Chrome will automatically prompt with an **"Add NovaDownloader to Home screen"** banner (or tap the 3-dot menu > **Install app**).
3. The app installs directly into your app drawer with full offline caching and responsive controls.

---

## 📦 Building Standalone Installers

### Build macOS Apple Silicon / Intel (`.dmg`):
```bash
npm run dist:mac
```
The compiled `.dmg` will be in `release/`.

### Build Windows Installer (`.exe`):
```bash
npm run dist:win
```
The NSIS setup installer and standalone portable `.exe` will be in `release/`.

---

## 🤖 GitHub Actions Automated Releases

This repository includes a continuous deployment workflow in [`.github/workflows/release.yml`](.github/workflows/release.yml).

Whenever a tag is pushed, GitHub Actions automatically builds and publishes both Windows and macOS installers:
```bash
git tag v1.0.0
git push origin v1.0.0
```
The binaries will be uploaded directly to [GitHub Releases](https://github.com/Jerryeni/yt-downloader/releases).

---

## ⚖️ License & Fair Use Disclaimer

Distributed under the **MIT License**. See `LICENSE` for details.

*Disclaimer: NovaDownloader is an educational tool designed for downloading personal media, creative commons, and public domain content under fair use. Please respect copyright laws and the terms of service of respective content platforms.*
