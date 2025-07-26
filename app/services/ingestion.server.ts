// @ts-ignore
import * as pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { encoding_for_model } from "tiktoken";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mime from "mime-types";
import _ from "lodash";
import { config } from "app/lib/config.server";
import { upsertVectors, type DocumentVector } from "./qdrant.server";
import pLimit from "p-limit";
import { ProcessDocumentJobData } from "app/types/queue";
import prisma from "app/lib/db.server";
import logger from "app/utils/logger";
import { uploadToS3 } from "app/lib/s3.server";
import fetch from "node-fetch";

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

const encoder = encoding_for_model("gpt-3.5-turbo");

// Limit concurrent embedding requests
const embeddingLimit = pLimit(5);

// Supported file processors
const FILE_PROCESSORS = {
  "application/pdf": async (buffer: Buffer) => {
    const pdfData = await pdfParse.default(buffer);
    return pdfData.text;
  },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    async (buffer: Buffer) => {
      const docResult = await mammoth.extractRawText({ buffer });
      return docResult.value;
    },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": async (
    buffer: Buffer,
  ) => {
    return processExcelFile(buffer);
  },
  "application/vnd.ms-excel": async (buffer: Buffer) => {
    return processExcelFile(buffer);
  },
  "text/plain": async (buffer: Buffer) => {
    return buffer.toString("utf-8");
  },
  "text/csv": async (buffer: Buffer) => {
    return buffer.toString("utf-8");
  },
};

function processExcelFile(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    text += `Sheet: ${sheetName}\n`;
    text += XLSX.utils.sheet_to_csv(sheet) + "\n\n";
  });
  return text;
}

export async function extractTextFromFile(
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  try {
    // Validate file type
    const detectedType = await fileTypeFromBuffer(buffer);
    const expectedMime = mime.lookup(filename) || contentType;

    if (
      detectedType &&
      detectedType.mime !== expectedMime &&
      detectedType.mime !== contentType
    ) {
      throw new Error(
        `File content doesn't match expected format. Expected: ${contentType}, Got: ${detectedType.mime}`,
      );
    }

    // Get processor for this content type
    const processor =
      FILE_PROCESSORS[contentType as keyof typeof FILE_PROCESSORS];
    if (!processor) {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    return await processor(buffer);
  } catch (error) {
    logger.error("Error extracting text:", error);
    throw new Error(
      `Failed to extract text from ${filename}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function chunkText(
  text: string,
  maxTokens: number = config.CHUNK_SIZE,
  overlap: number = config.CHUNK_OVERLAP,
): Promise<{ text: string; startChar: number; endChar: number }[]> {
  // Use LangChain's text splitter for better chunking
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxTokens * 4, // Approximate tokens to characters ratio
    chunkOverlap: overlap,
    separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
  });

  const chunks = await textSplitter.createDocuments([text]);

  // Convert to your expected format with character positions
  let currentPosition = 0;
  const result: { text: string; startChar: number; endChar: number }[] = [];

  for (const chunk of chunks) {
    const chunkText = chunk.pageContent;
    const startChar = text.indexOf(chunkText, currentPosition);
    const endChar = startChar + chunkText.length;

    // Validate token count
    const tokens = encoder.encode(chunkText);
    if (tokens.length <= maxTokens && chunkText.length > 20) {
      result.push({
        text: chunkText,
        startChar: startChar >= 0 ? startChar : currentPosition,
        endChar: startChar >= 0 ? endChar : currentPosition + chunkText.length,
      });
    }

    currentPosition = endChar;
  }

  return result;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("🧮 🧮 🧮 🧮 🧮 ", text);
  return embeddingLimit(async () => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text.slice(0, 8000), // Limit input size
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error("Error generating embedding:", error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });
}

// Update DocumentVector type locally to allow uploadedBy
export type DocumentVectorWithUser = DocumentVector & {
  payload: DocumentVector["payload"] & { uploadedBy: string };
};

export async function processDocumentJob(data: ProcessDocumentJobData) {
  const { documentId, filePath, filename, contentType } = data;

  try {
    // Update status to processing
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "PROCESSING" },
    });

    // Read file (support S3 URL or local path)
    let buffer: Buffer;
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      const res = await fetch(filePath);
      if (!res.ok)
        throw new Error(`Failed to fetch file from S3: ${res.statusText}`);
      buffer = Buffer.from(await res.arrayBuffer());
    } else {
      buffer = await fs.readFile(filePath);
    }

    // Extract text
    const text = await extractTextFromFile(buffer, contentType, filename);

    if (!text || text.trim().length === 0) {
      throw new Error("No text content extracted from file");
    }

    // Chunk text
    const chunks = await chunkText(text);

    if (chunks.length === 0) {
      throw new Error("No valid chunks created from text");
    }

    // Process chunks in batches using lodash chunk
    const vectors: DocumentVector[] = [];
    const batchSize = config.BATCH_SIZE;
    const batches = _.chunk(chunks, batchSize);

    // Fetch uploadedBy from document
    const docRecord = await prisma.document.findUnique({
      where: { id: documentId },
    });
    const uploadedBy = docRecord?.uploadedBy || "user-mvp-placeholder";

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      // Generate embeddings for batch
      const embeddings = await Promise.all(
        batch.map((chunkItem) => generateEmbedding(chunkItem.text)),
      );

      // Create database records and vector objects
      for (let j = 0; j < batch.length; j++) {
        const chunkItem = batch[j];
        const embedding = embeddings[j];
        const chunkIndex = batchIndex * batchSize + j;
        const vectorId = uuidv4();

        // Save to database
        // await prisma.documentChunk.create({
        //   data: {
        //     id: vectorId,
        //     documentId,
        //     chunkText: chunkItem.text,
        //     chunkIndex,
        //     tokenCount: encoder.encode(chunkItem.text).length,
        //     startChar: chunkItem.startChar,
        //     endChar: chunkItem.endChar,
        //     pineconeId: vectorId,
        //   },
        // });

        // Prepare vector for Qdrant
        vectors.push({
          id: vectorId,
          vector: embedding,
          payload: {
            documentId,
            chunkIndex,
            text: chunkItem.text,
            tokenCount: encoder.encode(chunkItem.text).length,
            filename,
            contentType,
            createdAt: new Date().toISOString(),
            uploadedBy,
          } as DocumentVector["payload"] & { uploadedBy: string },
        });
      }
    }

    // Upload vectors to Qdrant
    await upsertVectors(vectors);

    // Update document status
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "PROCESSED",
        totalChunks: chunks.length,
        processedAt: new Date(),
        pineconeIds: vectors.map((v) => v.id),
      },
    });

    // Clean up uploaded file (only if local)
    if (!(filePath.startsWith("http://") || filePath.startsWith("https://"))) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn("Failed to delete uploaded file:", error);
      }
    }

    return {
      documentId,
      chunksCreated: chunks.length,
      vectorsUploaded: vectors.length,
    };
  } catch (error) {
    logger.error(`Error processing document ${documentId}:`, error);

    // Update document with error
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    });

    // Clean up uploaded file after error (only if local)
    if (!(filePath.startsWith("http://") || filePath.startsWith("https://"))) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        logger.warn(
          "Failed to delete uploaded file after error:",
          cleanupError,
        );
      }
    }

    throw error;
  }
}

export async function saveUploadedFile(
  buffer: Buffer,
  filename: string,
  contentType?: string,
): Promise<string> {
  // Generate unique S3 key with extension
  const ext =
    mime.extension(mime.lookup(filename) || contentType || "bin") ||
    path.extname(filename);
  const uniqueFilename = `${uuidv4()}.${ext}`;
  const s3Key = `uploads/${uniqueFilename}`;
  const s3Url = await uploadToS3(
    buffer,
    s3Key,
    contentType || mime.lookup(filename) || "application/octet-stream",
  );
  return s3Url;
}
