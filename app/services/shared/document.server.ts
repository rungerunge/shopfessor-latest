// shared/document.server.ts
import { v4 as uuidv4 } from "uuid";
import { encoding_for_model } from "tiktoken";
import prisma from "app/lib/db.server";
import { DocumentStatus, FileType } from "@prisma/client";
import logger from "app/utils/logger";
import { generateEmbedding } from "./embedding.server";
import { upsertVectors, type DocumentVector } from "../qdrant.server";

const encoder = encoding_for_model("gpt-3.5-turbo");

export async function updateDocumentStatus(
  documentId: string,
  status: DocumentStatus,
  additionalData = {},
) {
  return prisma.document.update({
    where: { id: documentId },
    data: { status, ...additionalData },
  });
}

export async function createDocumentRecord(data: {
  filename: string;
  originalName: string;
  contentType: string;
  fileSize: number;
  uploadedBy: string;
  fileUrl?: string;
  s3Key?: string;
  s3Url?: string;
  shopId: string;
}) {
  return prisma.document.create({
    data: {
      ...data,
      fileType: getFileType(data.contentType),
      fileUrl: data.fileUrl || "",
      status: "UPLOADED",
      mimeType: data.contentType,
    },
  });
}

function sanitizeText(text: string): string {
  return text
    .replace(/\0/g, "") // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove other control characters
    .trim();
}

async function createDocumentChunk(
  vectorId: string,
  documentId: string,
  chunkItem: { text: string; startChar: number; endChar: number },
  chunkIndex: number,
) {
  const sanitizedText = sanitizeText(chunkItem.text);
  logger.info("🔥 text: ", sanitizedText);
  return prisma.documentChunk.create({
    data: {
      id: vectorId,
      documentId,
      chunkText: sanitizedText,
      chunkIndex,
      tokenCount: encoder.encode(sanitizedText).length,
      startChar: chunkItem.startChar,
      endChar: chunkItem.endChar,
      pineconeId: vectorId,
    },
  });
}

export async function processChunksToVectors(
  chunks: { text: string; startChar: number; endChar: number }[],
  documentId: string,
  filename: string,
  contentType: string,
  uploadedBy: string,
): Promise<DocumentVector[]> {
  const vectors: DocumentVector[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const sanitizedText = sanitizeText(chunk.text);
    const vectorId = uuidv4();
    const embedding = await generateEmbedding(sanitizedText);

    // Create chunk in database
    await createDocumentChunk(
      vectorId,
      documentId,
      { ...chunk, text: sanitizedText },
      i,
    );

    // Create vector for Qdrant
    vectors.push({
      id: vectorId,
      vector: embedding,
      payload: {
        documentId,
        chunkIndex: i,
        text: sanitizedText,
        tokenCount: encoder.encode(sanitizedText).length,
        filename,
        contentType,
        createdAt: new Date().toISOString(),
        uploadedBy,
      } as DocumentVector["payload"] & { uploadedBy: string },
    });
  }

  await upsertVectors(vectors);
  return vectors;
}

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
