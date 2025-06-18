/**
 * 🖼️ Image Processing Job Processor
 *
 * 📝 Description:
 * Handles image processing tasks for jobs enqueued in the 'process-image' queue.
 * This function is executed by the worker when an image job arrives.
 *
 * 📦 Expected Job Data:
 * - imageUrl (string): URL of the image to process.
 * - userId (string): ID of the user requesting processing.
 * - transformations (object): Processing instructions (resize, format, etc.).
 *
 * ⚙️ Processing Logic:
 * - Simulates multi-step image processing.
 * - Updates job progress at 25%, 50%, 75%, and 100% stages.
 * - Logs both success and error states to console.
 */

import { Job } from "bullmq";
import { ImageProcessingJobData } from "app/types/queue";

export async function processImageJob(job: Job<ImageProcessingJobData>) {
  const { imageUrl, userId, transformations } = job.data;

  try {
    console.log(`Processing image ${imageUrl} for user ${userId}`);

    // Simulate image processing steps
    await job.updateProgress(25);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await job.updateProgress(50);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await job.updateProgress(75);
    await new Promise((resolve) => setTimeout(resolve, 500));

    await job.updateProgress(100);

    console.log(`Image processing completed for ${imageUrl}`);
  } catch (error) {
    console.error("Failed to process image:", error);
    throw error;
  }
}
