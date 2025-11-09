import * as fs from "fs/promises";
import * as path from "path";
import { IFileStorageService } from "../IFileStorageService";

export interface LocalStorageConfig {
  uploadDirectory: string;
  baseUrl: string; // Base URL for serving files (e.g., 'http://localhost:3000/uploads')
}

export class LocalFileStorageService implements IFileStorageService {
  constructor(private config: LocalStorageConfig) {}

  private normalizeRel(p: string): string {
    return p
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^uploads\/+/i, "");
  }

  /** Build a public URL that contains exactly one '/uploads/' prefix. */
  private buildPublicUrl(rel: string): string {
    const base = this.config.baseUrl.replace(/\/+$/, ""); // trim trailing slash
    const cleanRel = this.normalizeRel(rel);
    const hasUploads = /\/uploads$/i.test(base);
    return `${base}${hasUploads ? "" : "/uploads"}/${cleanRel}`;
  }

  async uploadFile(
    file: Buffer,
    filePath: string,
    _contentType: string
  ): Promise<string> {
    try {
      const rel = this.normalizeRel(filePath); // e.g. 'items/<id>/image.webp'
      const fullPath = path.join(this.config.uploadDirectory, rel); // '/app/uploads/items/<id>/image.webp'
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, file);
      return this.buildPublicUrl(rel); // 'http://.../uploads/items/<id>/image.webp'
    } catch (error) {
      throw new Error(
        `Failed to upload file locally: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.config.uploadDirectory, filePath);
      await fs.unlink(fullPath);
    } catch (error) {
      // If file doesn't exist, consider it successfully deleted
      if ((error as any)?.code === "ENOENT") {
        return;
      }
      throw new Error(
        `Failed to delete file locally: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
    const normalizedPath = filePath.replace(/\\/g, "/");
    return `${this.config.baseUrl}/${normalizedPath}`;
  }
}
