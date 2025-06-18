import { queueManager } from "app/lib/queue-manager.server";
import { JobTypes } from "app/types/queue";

export class QueueService {
  static async sendEmail(emailData: JobTypes["send-email"]) {
    return await queueManager.addJob("send-email", emailData);
  }

  static async processImage(imageData: JobTypes["process-image"]) {
    return await queueManager.addJob("process-image", imageData, {
      priority: 10, // Higher priority for image processing
    });
  }

  static async scheduleReport(
    reportData: JobTypes["generate-report"],
    cron: string,
  ) {
    return await queueManager.addJob("generate-report", reportData, {
      repeat: { cron },
    });
  }

  static async delayedEmail(
    emailData: JobTypes["send-email"],
    delayMs: number,
  ) {
    return await queueManager.addJob("send-email", emailData, {
      delay: delayMs,
    });
  }
}
