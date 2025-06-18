/**
 * 📧 Email Job Processor
 *
 * 📝 Description:
 * Handles sending emails for jobs enqueued in the 'send-email' queue.
 * This function gets executed by the worker when an email job arrives.
 *
 * 📦 Expected Job Data:
 * - to (string): Recipient email address.
 * - subject (string): Email subject line.
 * - body (string): Email content (plain text or HTML).
 * - template (string, optional): Template identifier (if applicable).
 *
 * ⚙️ Processing Logic:
 * - Simulates email sending (replace with real email provider logic).
 * - Updates job progress to 100% upon completion.
 * - Logs success and errors to console.
 */

import { Job } from "bullmq";
import { EmailJobData } from "app/types/queue";

export async function processEmailJob(job: Job<EmailJobData>) {
  const { to, subject, body, template } = job.data;

  try {
    // Your email sending logic here
    console.log(`Sending email to ${to} with subject: ${subject}`);

    // Simulate email sending
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update job progress
    await job.updateProgress(100);

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
}
