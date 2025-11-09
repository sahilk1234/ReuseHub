import * as fs from 'fs/promises';
import * as path from 'path';
import { IFileStorageService } from '../IFileStorageService';

export interface LocalStorageConfig {
  uploadDirectory: string;
  baseUrl: string; // Base URL for serving files (e.g., 'http://localhost:3000/uploads')
}

export class LocalFileStorageService implements IFileStorageService {
  constructor(private config: LocalStorageConfig) {}

  async uploadFile(file: Buffer, filePath: string, contentType: string): Promise<string> {
    try {
      const fullPath = path.join(this.config.uploadDirectory, filePath);
      const directory = path.dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Write file
      await fs.writeFile(fullPath, file);

      // Return public URL
      return this.getPublicUrl(filePath);
    } catch (error) {
      throw new Error(`Failed to upload file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.config.uploadDirectory, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      // If file doesn't exist, consider it successfully deleted
      if ((error as any)?.code === 'ENOENT') {
        return;
      }
      throw new Error(`Failed to delete file locally: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(filePath: string): Promise<string> {
    return this.getPublicUrl(filePath);
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.config.uploadDirectory, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  private getPublicUrl(filePath: string): string {
    // Normalize path separators for URLs
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `${this.config.baseUrl}/${normalizedPath}`;
  }
}