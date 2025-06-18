/**
 * 📧 Example API Endpoint: Queue Email Sending
 *
 * This is a sample Remix action that demonstrates how to use the QueueService
 * to enqueue email sending tasks. 📨⚙️
 *
 * 👉 Usage:
 * - Method: POST
 * - Content-Type: application/json
 * - Body Parameters:
 *    - to (string): Recipient email address.
 *    - subject (string): Email subject line.
 *    - body (string): Email content (plain text or HTML).
 *
 * ✅ The request will enqueue an email to be sent asynchronously.
 *
 * ❌ Any non-POST requests will receive a 405 Method Not Allowed.
 * ⚠️ Errors during queueing will return a 500 status with an error message.
 */

import { ActionFunctionArgs, json } from "@remix-run/node";
import { QueueService } from "app/services/queue.server";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { to, subject, body } = await request.json();

    const job = await QueueService.sendEmail({
      to,
      subject,
      body,
    });

    return json({
      success: true,
      jobId: job.id,
      message: "Email queued successfully",
    });
  } catch (error) {
    console.error("Failed to queue email:", error);
    return json({ error: "Failed to queue email" }, { status: 500 });
  }
}
