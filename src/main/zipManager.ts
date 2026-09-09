import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { CreateZipRequest, CreateZipResult } from '../shared/types';

export class ZipManager {
  /**
   * Creates a compressed .zip archive containing specified files with clean entry names.
   * Fully compatible with macOS, Windows, and Linux.
   */
  public async createZipArchive(req: CreateZipRequest): Promise<CreateZipResult> {
    return new Promise((resolve) => {
      try {
        if (!req.files || req.files.length === 0) {
          return resolve({ success: false, zipPath: '', error: 'No files provided to zip' });
        }

        // Clean and sanitize the archive name
        let cleanName = req.archiveName.trim();
        // Remove illegal filesystem characters
        cleanName = cleanName.replace(/[<>:"/\\|?*]/g, '_').trim();
        if (!cleanName.toLowerCase().endsWith('.zip')) {
          cleanName += '.zip';
        }

        const outputFolder = req.outputFolder;
        if (!fs.existsSync(outputFolder)) {
          fs.mkdirSync(outputFolder, { recursive: true });
        }

        const targetZipPath = path.join(outputFolder, cleanName);
        const outputStream = fs.createWriteStream(targetZipPath);
        const archive = archiver('zip', {
          zlib: { level: 5 }, // Balanced compression ratio & execution speed
        });

        outputStream.on('close', async () => {
          // If user chose to delete originals after successful zipping
          if (req.deleteOriginals) {
            for (const item of req.files) {
              try {
                if (fs.existsSync(item.filePath)) {
                  fs.unlinkSync(item.filePath);
                }
              } catch (delErr: any) {
                console.error(`Failed to remove original file ${item.filePath}:`, delErr);
              }
            }
          }

          resolve({
            success: true,
            zipPath: targetZipPath,
          });
        });

        archive.on('error', (err: any) => {
          console.error(`Archive creation error: ${err.message}`);
          resolve({
            success: false,
            zipPath: '',
            error: err.message,
          });
        });

        archive.on('warning', (warning: any) => {
          if (warning.code === 'ENOENT') {
            console.warn('Archiver warning:', warning);
          } else {
            console.error('Archiver error warning:', warning);
          }
        });

        archive.pipe(outputStream);

        // Add each file to the archive
        let addedCount = 0;
        for (const item of req.files) {
          if (item.filePath && fs.existsSync(item.filePath)) {
            // Sanitize entry name inside the zip
            const entryName = item.entryName.replace(/[<>:"/\\|?*]/g, '_').trim();
            archive.file(item.filePath, { name: entryName });
            addedCount++;
          } else {
            console.warn(`File does not exist for archiving: ${item.filePath}`);
          }
        }

        if (addedCount === 0) {
          archive.abort();
          try {
            if (fs.existsSync(targetZipPath)) fs.unlinkSync(targetZipPath);
          } catch {}
          return resolve({
            success: false,
            zipPath: '',
            error: 'None of the specified files were found on disk to zip.',
          });
        }

        archive.finalize();
      } catch (err: any) {
        console.error(`Unexpected exception during ZIP creation: ${err.message || String(err)}`);
        resolve({
          success: false,
          zipPath: '',
          error: err.message || 'Unknown error occurred during ZIP creation',
        });
      }
    });
  }
}
