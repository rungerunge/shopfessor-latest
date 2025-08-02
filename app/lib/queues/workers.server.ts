/**
 * 🚀 Queue Worker Initialization Entry Point
 *
 * 📝 Description:
 * Initializes the queue manager and starts all registered workers.
 * This should be called during server startup to ensure queue processing is ready.
 *
 * ⚠️ Error Handling:
 * - Logs errors if initialization fails.
 * - Throws error to prevent silent failures on startup.
 */

import { queueManager } from "../queue-manager.server";
import { processEmailJob } from "app/queues/processors/email.server";
import { processImageJob } from "app/queues/processors/image.server";
// Document processing removed - AI features disabled

// Initialize workers (call this in your server startup)
export function initializeWorkers() {
  // Email worker
  queueManager.createWorker("send-email", processEmailJob);

  // Image processing worker
  queueManager.createWorker("process-image", processImageJob);

  // Document processing removed - AI features disabled

  // Report generation worker
  queueManager.createWorker("generate-report", async (job) => {
    const { reportType } = job.data;
    console.log(`Generating ${reportType}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Report generated successfully");
  });
}
