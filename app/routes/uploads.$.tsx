import type { LoaderFunctionArgs } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import fs from "fs";
import path from "path";
import mime from "mime-types";

/**
 * Static file server for uploaded files
 * Serves files from Railway persistent storage
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const filePath = params["*"];
  
  if (!filePath) {
    throw new Response("File not found", { status: 404 });
  }

  // Security: prevent directory traversal
  if (filePath.includes("..") || filePath.includes("~")) {
    throw new Response("Invalid file path", { status: 400 });
  }

  try {
    const uploadDir = process.env.UPLOAD_DIR || "./uploads";
    const fullPath = path.join(process.cwd(), uploadDir, filePath);
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      throw new Response("File not found", { status: 404 });
    }

    // Get file stats
    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      throw new Response("Not a file", { status: 400 });
    }

    // Determine content type
    const contentType = mime.lookup(fullPath) || "application/octet-stream";
    
    // Create readable stream
    const fileStream = fs.createReadStream(fullPath);
    const readableStream = createReadableStreamFromReadable(fileStream);

    // Set appropriate headers
    const headers = new Headers({
      "Content-Type": contentType,
      "Content-Length": stats.size.toString(),
      "Cache-Control": "public, max-age=31536000, immutable", // Cache for 1 year
    });

    // Add Content-Disposition for downloads
    if (!contentType.startsWith("image/")) {
      const filename = path.basename(fullPath);
      headers.set("Content-Disposition", `attachment; filename="${filename}"`);
    }

    return new Response(readableStream, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error serving file:", error);
    throw new Response("Internal server error", { status: 500 });
  }
}