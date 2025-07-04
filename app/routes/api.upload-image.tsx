/**
 * 🚀 Example API Endpoint: Queue Image Processing
 *
 * This is a sample Remix action that demonstrates how to use the QueueService
 * to enqueue image processing tasks. 🔧🖼️
 *
 * 👉 Usage:
 * - Method: POST
 * - Content-Type: multipart/form-data
 * - Body Parameters:
 *    - imageUrl (string): The URL of the image to process.
 *
 * ✅ The request will enqueue a job with basic transformations:
 *    - Resize to 800x600
 *    - Convert to WebP format
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
    const formData = await request.formData();
    const imageUrl = formData.get("imageUrl") as string;

    const job = await QueueService.processImage({
      imageUrl,
      transformations: {
        resize: { width: 800, height: 600 },
        format: "webp",
      },
    });

    return json({
      success: true,
      jobId: job.id,
      message: "Image processing queued",
    });
  } catch (error) {
    console.error("Failed to queue image processing:", error);
    return json({ error: "Failed to queue image processing" }, { status: 500 });
  }
}
