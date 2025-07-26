import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import { config } from "app/lib/config.server";
import { generateEmbedding, chunkText } from "app/services/ingestion.server";
import { addDocumentToQueue } from "app/services/queue.server";
import {
  upsertVectors,
  deleteDocumentVectors,
  type DocumentVector,
} from "app/services/qdrant.server";
import { deleteFromS3, uploadToS3 } from "app/lib/s3.server";
import prisma from "app/lib/db.server";
import { v4 as uuidv4 } from "uuid";
import { FileType } from "@prisma/client";
import mime from "mime-types";
import path from "path";

// Supported file types for data sources
const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function getFileType(contentType: string): FileType {
  switch (contentType) {
    case "application/pdf":
      return FileType.PDF;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      return FileType.DOCX;
    case "text/plain":
      return FileType.TXT;
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return FileType.XLSX;
    case "text/csv":
      return FileType.CSV;
    default:
      return FileType.TXT;
  }
}

export async function processFileUpload(request: Request) {
  try {
    const uploadHandler = unstable_createMemoryUploadHandler({
      maxPartSize: config.MAX_FILE_SIZE,
    });

    const uploadForm = await unstable_parseMultipartFormData(
      request,
      uploadHandler,
    );
    const file = uploadForm.get("file") as File;
    const sourceName = uploadForm.get("sourceName") as string;

    if (!file || file.size === 0) {
      return json({ error: "No file selected" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return json({ error: "File type not supported" }, { status: 400 });
    }

    // Convert file to buffer and save
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate S3 key
    const ext =
      mime.extension(mime.lookup(file.name) || file.type || "bin") ||
      path.extname(file.name);
    const uniqueFilename = `${uuidv4()}.${ext}`;
    const s3Key = `uploads/${uniqueFilename}`;

    // Upload to S3
    const fileUrl = await uploadToS3(buffer, s3Key, file.type);

    const shopDB = await prisma.shop.findFirst();
    if (!shopDB) {
      return json({ error: "No shop found in database" }, { status: 500 });
    }

    // Create document record
    const document = await prisma.document.create({
      data: {
        filename: file.name,
        originalName: sourceName || file.name,
        contentType: file.type,
        fileType: getFileType(file.type),
        fileSize: file.size,
        status: "UPLOADED",
        uploadedBy: "user-mvp-placeholder",
        fileUrl: fileUrl,
        s3Key: s3Key,
        s3Url: fileUrl,
        mimeType: file.type,
        shopId: shopDB.id,
      },
    });

    // Add to processing queue
    await addDocumentToQueue({
      documentId: document.id,
      filePath: fileUrl,
      filename: file.name,
      contentType: file.type,
    });

    return json({
      success: true,
      documentId: document.id,
      message: "File uploaded and queued for processing",
    });
  } catch (error) {
    console.error("File upload error:", error);
    return json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function processTextContent(text: string, sourceName: string) {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text content is required");
    }

    // Create a unique ID for this text source
    const sourceId = uuidv4();

    // Chunk the text
    const chunks = await chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No valid chunks created from text");
    }

    const shopDB = await prisma.shop.findFirst();
    if (!shopDB) {
      throw new Error("No shop found in database");
    }

    // Create a record in the database for tracking
    const document = await prisma.document.create({
      data: {
        filename: `${sourceName}.txt`,
        originalName: sourceName,
        contentType: "text/plain",
        fileType: FileType.TXT,
        fileSize: text.length,
        status: "PROCESSED",
        uploadedBy: "user-mvp-placeholder",
        fileUrl: `text://${sourceName}`, // Virtual URL for text content
        mimeType: "text/plain",
        shopId: shopDB.id,
      },
    });

    // Generate embeddings and create vectors
    const vectors: DocumentVector[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateEmbedding(chunk.text);

      vectors.push({
        id: `${sourceId}_${chunk.startChar}_${chunk.endChar}`,
        vector: embedding,
        payload: {
          documentId: document.id,
          chunkIndex: i,
          text: chunk.text,
          tokenCount: Math.ceil(chunk.text.length / 4), // Approximate token count
          filename: `${sourceName}.txt`,
          contentType: "text/plain",
          createdAt: new Date().toISOString(),
        },
      });
    }

    // Store vectors in Qdrant
    await upsertVectors(vectors);

    // Create chunk records
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await prisma.documentChunk.create({
        data: {
          documentId: document.id,
          chunkText: chunk.text,
          chunkIndex: i,
          tokenCount: Math.ceil(chunk.text.length / 4), // Approximate token count
          startChar: chunk.startChar,
          endChar: chunk.endChar,
        },
      });
    }

    return {
      success: true,
      documentId: document.id,
      chunksCount: chunks.length,
      message: "Text processed and indexed successfully",
    };
  } catch (error) {
    console.error("Text processing error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Text processing failed",
    );
  }
}

export async function getDataSourceStats() {
  const [totalDocuments, processedDocuments, totalChunks] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "PROCESSED" } }),
    prisma.documentChunk.count(),
  ]);

  return {
    totalDocuments,
    processedDocuments,
    totalChunks,
  };
}

export async function getRecentDataSources(limit: number = 20) {
  return await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { chunks: true },
      },
    },
    take: limit,
  });
}

export async function deleteDataSource(documentId: string) {
  try {
    // Get the document first to extract S3 key and other metadata
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        chunks: true,
      },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Delete from Qdrant vector database
    try {
      await deleteDocumentVectors(documentId);
    } catch (error) {
      console.error("Failed to delete vectors from Qdrant:", error);
      // Continue with other deletions even if Qdrant fails
    }

    // Delete from S3 if s3Key exists
    if (document.s3Key) {
      try {
        await deleteFromS3(document.s3Key);
      } catch (error) {
        console.error("Failed to delete file from S3:", error);
        // Continue with database deletion even if S3 fails
      }
    } else if (
      document.fileUrl &&
      document.fileUrl.includes("s3.amazonaws.com")
    ) {
      // Try to extract S3 key from URL if s3Key is not stored
      try {
        const urlParts = document.fileUrl.split("/");
        const s3Key = urlParts.slice(3).join("/"); // Remove https://bucket.s3.region.amazonaws.com/
        await deleteFromS3(s3Key);
      } catch (error) {
        console.error("Failed to delete file from S3 using URL:", error);
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete from database (this will cascade to chunks due to the relation)
    await prisma.document.delete({
      where: { id: documentId },
    });

    return {
      success: true,
      message: "Data source deleted successfully",
    };
  } catch (error) {
    console.error("Error deleting data source:", error);
    throw error;
  }
}

export async function downloadDataSource(documentId: string) {
  try {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // If it's a text source, return the extracted text
    if (document.fileType === FileType.TXT && document.extractedText) {
      return {
        success: true,
        content: document.extractedText,
        filename: document.originalName,
        contentType: "text/plain",
      };
    }

    // For file sources, return the S3 URL or file URL
    if (document.s3Url) {
      return {
        success: true,
        url: document.s3Url,
        filename: document.originalName,
        contentType: document.mimeType,
      };
    }

    if (document.fileUrl && !document.fileUrl.startsWith("text://")) {
      return {
        success: true,
        url: document.fileUrl,
        filename: document.originalName,
        contentType: document.mimeType,
      };
    }

    throw new Error("No downloadable content found");
  } catch (error) {
    console.error("Error downloading data source:", error);
    throw error;
  }
}
