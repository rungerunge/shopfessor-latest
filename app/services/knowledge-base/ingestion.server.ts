
// ingestion.server.ts (refactored)
// @ts-ignore
import * as pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { encoding_for_model } from "tiktoken";
import { fileTypeFromBuffer } from "file-type";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import mime from "mime-types";
import { config } from "app/lib/config.server";
import { type DocumentVector } from "../qdrant.server";
import { ProcessDocumentJobData } from "app/types/queue";
import prisma from "app/lib/db.server";
import logger from "app/utils/logger";
import { DocumentStatus } from "@prisma/client";
import {
  updateDocumentStatus,
  processChunksToVectors
} from "../shared/document.server";
import {
  readFileFromPath,
  cleanupFile,
  saveUploadedFile
} from "../shared/file-utils.server";

const encoder = encoding_for_model("gpt-3.5-turbo");

// File processors
const FILE_PROCESSORS = {
  "application/pdf": extractPdfText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    extractDocxText,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    extractExcelText,
  "application/vnd.ms-excel": extractExcelText,
  "text/plain": extractPlainText,
  "text/csv": extractPlainText,
};

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfData = await pdfParse.default(buffer);
  return pdfData.text;
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const docResult = await mammoth.extractRawText({ buffer });
  return docResult.value;
}

async function extractExcelText(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  let text = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    text += `Sheet: ${sheetName}\n`;
    text += XLSX.utils.sheet_to_csv(sheet) + "\n\n";
  });

  return text;
}

async function extractPlainText(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

export async function extractTextFromFile(
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<string> {
  try {
    await validateFileType(buffer, contentType, filename);

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

async function validateFileType(
  buffer: Buffer,
  contentType: string,
  filename: string,
): Promise<void> {
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
}

export async function chunkText(
  text: string,
  maxTokens: number = config.CHUNK_SIZE,
  overlap: number = config.CHUNK_OVERLAP,
): Promise<{ text: string; startChar: number; endChar: number }[]> {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: maxTokens * 4,
    chunkOverlap: overlap,
    separators: ["\n\n", "\n", ". ", "! ", "? ", " ", ""],
  });

  const chunks = await textSplitter.createDocuments([text]);
  return processChunks(chunks, text, maxTokens);
}

function processChunks(chunks: any[], originalText: string, maxTokens: number) {
  let currentPosition = 0;
  const result: { text: string; startChar: number; endChar: number }[] = [];

  for (const chunk of chunks) {
    const chunkText = chunk.pageContent;
    const startChar = originalText.indexOf(chunkText, currentPosition);
    const endChar = startChar + chunkText.length;

    if (isValidChunk(chunkText, maxTokens)) {
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

function isValidChunk(text: string, maxTokens: number): boolean {
  const tokens = encoder.encode(text);
  return tokens.length <= maxTokens && text.length > 20;
}

export async function processDocumentJob(data: ProcessDocumentJobData) {
  const { documentId, filePath, filename, contentType } = data;

  try {
    await updateDocumentStatus(documentId, DocumentStatus.PROCESSED);

    const buffer = await readFileFromPath(filePath);
    const text = await extractTextFromFile(buffer, contentType, filename);

    if (!text?.trim()) {
      throw new Error("No text content extracted from file");
    }

    const chunks = await chunkText(text);
    if (chunks.length === 0) {
      throw new Error("No valid chunks created from text");
    }

    const docRecord = await prisma.document.findUnique({
      where: { id: documentId },
    });
    const uploadedBy = docRecord?.uploadedBy || "user-mvp-placeholder";

    const vectors = await processChunksToVectors(
      chunks,
      documentId,
      filename,
      contentType,
      uploadedBy
    );

    await updateDocumentStatus(documentId, "PROCESSED", {
      totalChunks: chunks.length,
      processedAt: new Date(),
      pineconeIds: vectors.map((v) => v.id),
    });

    await cleanupFile(filePath);

    return {
      documentId,
      chunksCreated: chunks.length,
      vectorsUploaded: vectors.length,
    };
  } catch (error) {
    logger.error(`Error processing document ${documentId}:`, error);

    await updateDocumentStatus(documentId, "FAILED", {
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    await cleanupFile(filePath);
    throw error;
  }
}

export type DocumentVectorWithUser = DocumentVector & {
  payload: DocumentVector["payload"] & { uploadedBy: string };
};

export { saveUploadedFile };
