import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import logger from "app/utils/logger";

/**
 * Railway Local Storage Service
 * Uses Railway persistent volumes instead of AWS S3
 */
export class RailwayStorageService {
  private readonly uploadDir: string;

  constructor() {
    // Use Railway persistent volume or local uploads directory
    this.uploadDir = process.env.UPLOAD_DIR || "./uploads";
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "sections"), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, "images"), { recursive: true });
    } catch (error) {
      logger.error("Failed to create upload directories:", error);
    }
  }

  /**
   * Upload file to Railway storage
   */
  async uploadFile(
    buffer: Buffer,
    filename: string,
    contentType?: string,
    folder: "sections" | "images" = "sections"
  ): Promise<string> {
    try {
      const ext = mime.extension(contentType || mime.lookup(filename) || "bin") || 
                  path.extname(filename).slice(1);
      
      const uniqueFilename = `${uuidv4()}.${ext}`;
      const filePath = path.join(this.uploadDir, folder, uniqueFilename);
      
      await fs.writeFile(filePath, buffer);
      
      // Return the public URL path (relative to app root)
      const publicPath = `/uploads/${folder}/${uniqueFilename}`;
      
      logger.info("File uploaded successfully", { 
        originalFilename: filename,
        storedFilename: uniqueFilename,
        path: publicPath,
        size: buffer.length
      });
      
      return publicPath;
    } catch (error) {
      logger.error("Failed to upload file:", error);
      throw new Error("File upload failed");
    }
  }

  /**
   * Delete file from Railway storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      // Convert public path back to file system path
      const fullPath = path.join(process.cwd(), filePath);
      await fs.unlink(fullPath);
      logger.info("File deleted successfully", { path: filePath });
    } catch (error) {
      logger.warn("Failed to delete file:", error);
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getFileStats(filePath: string): Promise<{ size: number; mtime: Date } | null> {
    try {
      const fullPath = path.join(process.cwd(), filePath);
      const stats = await fs.stat(fullPath);
      return {
        size: stats.size,
        mtime: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get public URL for file
   * In Railway, this will be served directly by the app
   */
  getPublicUrl(filePath: string): string {
    const baseUrl = process.env.RAILWAY_STATIC_URL || 
                   process.env.SHOPIFY_APP_URL || 
                   "http://localhost:3000";
    return `${baseUrl}${filePath}`;
  }
}

export const railwayStorage = new RailwayStorageService();

// Compatibility functions for existing S3 code
export async function uploadToRailway(
  buffer: Buffer,
  filename: string,
  contentType?: string,
  folder: "sections" | "images" = "sections"
): Promise<string> {
  return railwayStorage.uploadFile(buffer, filename, contentType, folder);
}

export async function deleteFromRailway(filePath: string): Promise<void> {
  return railwayStorage.deleteFile(filePath);
}