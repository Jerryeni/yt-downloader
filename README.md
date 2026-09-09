# ⚡ NovaDownloader

<div align="center">

![NovaDownloader Banner](https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/.github/banner.svg)

### The modern, ultra-fast 4K video & high-fidelity audio downloader for macOS and Windows.
**Powered by `yt-dlp` and `ffmpeg` with a sleek glassmorphic desktop interface.**

[![Release](https://img.shields.io/github/v/release/yourusername/nova-downloader?style=for-the-badge&color=8b5cf6)](https://github.com/yourusername/nova-downloader/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-06b6d4?style=for-the-badge)](https://github.com/yourusername/nova-downloader/releases/latest)
[![License](https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge)](LICENSE)
[![Engine](https://img.shields.io/badge/Engine-yt--dlp%20%2B%20ffmpeg-ff0033?style=for-the-badge)](https://github.com/yt-dlp/yt-dlp)

</div>

---

## 🚀 Download NovaDownloader

Get the latest pre-built binaries directly for your operating system:

| Operating System | Format | Download Link | Architecture |
| :--- | :--- | :--- | :--- |
| **macOS** | **Apple Disk Image (`.dmg`)** | [⬇️ Download for macOS](https://github.com/yourusername/nova-downloader/releases/latest) | Apple Silicon (M1/M2/M3/M4) & Intel |
| **macOS** | **Portable Archive (`.zip`)** | [⬇️ Download macOS Zip](https://github.com/yourusername/nova-downloader/releases/latest) | Universal |
| **Windows** | **Standard Installer (`.exe`)** | [⬇️ Download Windows Setup](https://github.com/yourusername/nova-downloader/releases/latest) | Windows 10 / 11 (64-bit) |
| **Windows** | **Portable Executable (`.exe`)** | [⬇️ Download Portable EXE](https://github.com/yourusername/nova-downloader/releases/latest) | Windows 10 / 11 (Standalone) |

> [!NOTE]
> Replace `yourusername/nova-downloader` in the URLs with your actual GitHub username/repository path once pushed.

---

## ✨ Features

- 🎥 **Up to 4K / 8K Video Support**: Download YouTube videos, Shorts, and streams in crystal-clear original resolution (4K 2160p, 1440p, 1080p 60fps, 720p).
- 🎵 **Lossless & Hi-Fi Audio Extraction**: Extract audio tracks into MP3 (320kbps), M4A (AAC), FLAC (lossless), or WAV formats.
- ⚡ **Real-Time Transfer Metrics**: Watch live download progress bars with real-time transfer speed (`MB/s`), time remaining (`ETA`), and total file size estimates.
- 📋 **Smart Clipboard Detection**: Copies a YouTube link? NovaDownloader detects it automatically and offers instant 1-click analysis.
- 🎨 **Next-Gen Cyber-Slate UI**: Built with glassmorphism, responsive backdrop filters, smooth animations, and curated dark color themes (*Cosmic Slate*, *Midnight Blue*, *Cyber Cyan*).
- 📑 **Batch & Multi-Link Queue**: Paste multiple URLs or entire playlists to queue and download all videos sequentially.
- 🖼️ **Cover Art & Subtitles**: Automatically embed high-res video thumbnails as album art and embed multi-language subtitle tracks directly into MP4 files.
- 🔄 **Self-Updating Core Engine**: Click **"Check Updates"** in Settings anytime to pull the newest official `yt-dlp` binary without waiting for an app release.
- 📁 **Seamless Finder & Explorer Integration**: Jump directly to your downloaded files or open them with your default media player with one click.

---

## 🛠️ Architecture & Tech Stack

- **Desktop Framework**: [Electron](https://www.electronjs.org/) (Secure context isolation, non-blocking IPC).
- **Frontend**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/).
- **Design System**: Vanilla CSS with custom properties, glassmorphism, backdrop filters, and [Lucide Icons](https://lucide.dev/).
- **Download Backend**: High-performance [yt-dlp](https://github.com/yt-dlp/yt-dlp) binary with custom streaming progress templates.
- **Media Transcoder**: [FFmpeg](https://ffmpeg.org/) for stream merging, metadata tagging, and audio extraction.
- **Packaging**: [electron-builder](https://www.electron.build/) with automated GitHub Actions CI/CD.

---

## 💻 Getting Started (Development)

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **FFmpeg**: Installed locally (`brew install ffmpeg` on macOS, or `winget install Gyan.FFmpeg` on Windows).

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/nova-downloader.git
cd nova-downloader
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development mode
```bash
npm run dev
```
*This will start Vite's hot-reloading dev server and launch Electron automatically.*

---

## 📦 Building for Production

### Build macOS Installer (`.dmg`):
```bash
npm run dist:mac
```
The compiled `.dmg` will be located in the `release/` folder.

### Build Windows Installer (`.exe`):
```bash
npm run dist:win
```
The NSIS setup and portable `.exe` will be located in the `release/` folder.

---

## 🤖 Automated GitHub Releases (CI/CD)

This repository includes a turnkey GitHub Actions workflow (`.github/workflows/release.yml`).

To publish a new release with downloadable `.dmg` and `.exe` files:
1. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: release v1.0.0"
   ```
2. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. GitHub Actions will automatically build both macOS and Windows installers and publish them under **Releases** on your GitHub repository!

---

## ⚖️ License & Disclaimer

Distributed under the **MIT License**. See `LICENSE` for more information.

*Disclaimer: NovaDownloader is an educational tool designed for downloading personal media and freely licensed content under fair use. Please respect copyright laws and the terms of service of the respective platforms.*
