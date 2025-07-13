import {
  json,
  unstable_parseMultipartFormData,
  unstable_createMemoryUploadHandler,
} from "@remix-run/node";
import { config } from "app/lib/config.server";
import {
  saveUploadedFile,
  generateEmbedding,
  chunkText,
} from "app/services/ingestion.server";
import { addDocumentToQueue } from "app/services/queue.server";
import { upsertVectors, type DocumentVector } from "app/services/qdrant.server";
import prisma from "app/lib/db.server";
import { v4 as uuidv4 } from "uuid";
import { FileType } from "@prisma/client";

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
    const filePath = await saveUploadedFile(buffer, file.name);

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
        fileUrl: filePath,
        mimeType: file.type,
        shopId: shopDB.id,
      },
    });

    // Add to processing queue
    const jobId = await addDocumentToQueue({
      documentId: document.id,
      filePath,
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
