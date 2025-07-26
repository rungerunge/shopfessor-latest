/*
  Warnings:

  - You are about to drop the column `isPublic` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `documents` table. All the data in the column will be lost.
  - Added the required column `contentType` to the `documents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "documents" DROP COLUMN "isPublic",
DROP COLUMN "uploadedAt",
ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "namespace" TEXT,
ADD COLUMN     "pineconeIds" TEXT[],
ADD COLUMN     "s3Key" TEXT,
ADD COLUMN     "s3Url" TEXT,
ADD COLUMN     "totalChunks" INTEGER,
ADD COLUMN     "uploadedBy" TEXT;

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "chunkText" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "tokenCount" INTEGER NOT NULL,
    "pineconeId" TEXT,
    "startChar" INTEGER,
    "endChar" INTEGER,
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_chunks_documentId_chunkIndex_idx" ON "document_chunks"("documentId", "chunkIndex");

-- AddForeignKey
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
