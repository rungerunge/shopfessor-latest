/**
 * ⚙️ Worker Initialization
 *
 * 📝 Description:
 * Registers all background job processors for the queue system.
 * This function should be called once during server startup to ensure
 * all workers are ready to process incoming jobs.
 *
 * 🧩 Workers Registered:
 * - 📧 send-email → processEmailJob
 * - 🖼️ process-image → processImageJob
 * - 📊 generate-report → inline report generator
 * (Document processing removed - AI features disabled)
 *
 * 🚀 Usage:
 * initializeWorkers();
 */

import { queueManager } from "./queue-manager.server";
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
