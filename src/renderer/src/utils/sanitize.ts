/**
 * Cleans YouTube titles by stripping redundant spam tags and illegal filesystem characters.
 * Guarantees proper, professional titles across Windows and macOS filesystems.
 */
export function sanitizeTitle(rawTitle: string): string {
  if (!rawTitle) return 'Untitled';

  let cleaned = rawTitle;

  // 1. Remove common YouTube bracketed tags (case-insensitive)
  const tagsToRemove = [
    /\[\s*official\s+music\s+video\s*\]/gi,
    /\(\s*official\s+music\s+video\s*\)/gi,
    /\[\s*official\s+video\s*\]/gi,
    /\(\s*official\s+video\s*\)/gi,
    /\[\s*official\s+audio\s*\]/gi,
    /\(\s*official\s+audio\s*\)/gi,
    /\[\s*lyric\s+video\s*\]/gi,
    /\(\s*lyric\s+video\s*\)/gi,
    /\[\s*lyrics\s*\]/gi,
    /\(\s*lyrics\s*\)/gi,
    /\[\s*visualizer\s*\]/gi,
    /\(\s*visualizer\s*\)/gi,
    /\[\s*4k\s*(60fps)?\s*\]/gi,
    /\(\s*4k\s*(60fps)?\s*\)/gi,
    /\[\s*hd\s*\]/gi,
    /\(\s*hd\s*\)/gi,
    /\[\s*hq\s*\]/gi,
    /\(\s*hq\s*\)/gi,
    /\|\s*official\s+video/gi,
  ];

  for (const regex of tagsToRemove) {
    cleaned = cleaned.replace(regex, '');
  }

  // 2. Replace illegal filesystem characters for Windows, macOS, and Linux
  // Illegal in Windows: < > : " / \ | ? *
  cleaned = cleaned.replace(/[<>:"/\\|?*]/g, '-');

  // 3. Normalize multiple hyphens, spaces, and clean ends
  cleaned = cleaned.replace(/-{2,}/g, '-');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/^[-_\s]+|[-_\s]+$/g, '');

  return cleaned || 'Untitled';
}

/**
 * Formats a clean, readable filename with optional 2-digit track numbering.
 * Example: "01. Artist - Track Name.mp3"
 */
export function formatProperFileName(index: number | undefined, title: string, ext: string): string {
  const cleanTitle = sanitizeTitle(title);
  const cleanExt = ext.replace(/^\.+/, '');

  if (index !== undefined && index > 0) {
    const paddedIndex = String(index).padStart(2, '0');
    return `${paddedIndex}. ${cleanTitle}.${cleanExt}`;
  }

  return `${cleanTitle}.${cleanExt}`;
}

/**
 * Formats a clean archive title.
 * Example: "Lofi Hip Hop Playlist.zip"
 */
export function formatProperArchiveName(title: string): string {
  let clean = sanitizeTitle(title);
  if (!clean.toLowerCase().endsWith('.zip')) {
    clean += '.zip';
  }
  return clean;
}
