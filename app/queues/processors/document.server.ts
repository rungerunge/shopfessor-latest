import { Job } from "bullmq";
import { ProcessDocumentJobData } from "app/types/queue";
import { processDocumentJob } from "app/services/knowledge-base/ingestion.server";
import logger from "app/utils/logger";

export async function processDocumentJobHandler(
  job: Job<ProcessDocumentJobData>,
) {
  const { documentId, filename } = job.data;

  try {
    logger.info(`🔄 Processing document: ${filename} (ID: ${documentId})`);

    // Update progress to 10%
    await job.updateProgress(10);

    // Process the document using the ingestion service
    await processDocumentJob(job.data);

    // Update progress to 100%
    await job.updateProgress(100);

    logger.info(`✅ Document processed successfully: ${filename}`);
  } catch (error) {
    logger.error(`❌ Error processing document ${filename}:`, error);
    throw error;
  }
}
