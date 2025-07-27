import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";
import path from "path";
import { uploadToS3 } from "app/lib/s3.server";
import logger from "app/utils/logger";
import fetch from "node-fetch";

export async function readFileFromPath(filePath: string): Promise<Buffer> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetch(filePath);
    if (!res.ok)
      throw new Error(`Failed to fetch file from S3: ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return fs.readFile(filePath);
}

export async function cleanupFile(filePath: string): Promise<void> {
  if (!(filePath.startsWith("http://") || filePath.startsWith("https://"))) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logger.warn("Failed to delete uploaded file:", error);
    }
  }
}

export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): Promise<string> {
  const ext =
    mime.extension(mime.lookup(filename) || contentType || "bin") ||
    path.extname(filename);
  const uniqueFilename = `${uuidv4()}.${ext}`;
  const s3Key = `uploads/${uniqueFilename}`;

  return uploadToS3(
    buffer,
    s3Key,
    contentType || mime.lookup(filename) || "application/octet-stream",
  );
}
