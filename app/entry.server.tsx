import { PassThrough } from "stream";
import { renderToPipeableStream } from "react-dom/server";
import { RemixServer } from "@remix-run/react";
import {
  createReadableStreamFromReadable,
  type EntryContext,
} from "@remix-run/node";
import { isbot } from "isbot";
import { addDocumentResponseHeaders } from "./lib/shopify.server";
import { initializeWorkers } from "app/lib/queues/workers.server";
import { queueManager } from "app/lib/queues/queue-manager.server";

// 🚀 Initialize background workers once when server starts
initializeWorkers();

// ⚠️ Graceful shutdown: Handle termination signals to cleanly close workers
process.on("SIGTERM", async () => {
  console.log("🛑 SIGTERM received — shutting down gracefully...");
  await queueManager.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("🛑 SIGINT received — shutting down gracefully...");
  await queueManager.shutdown();
  process.exit(0);
});

// ⏰ Timeout for streaming React response (5 seconds)
export const streamTimeout = 5000;

/**
 * Handles incoming requests by streaming the Remix React server-side rendered app.
 * Uses different rendering strategies for bots vs browsers for better SEO & UX.
 */
export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  // Add Shopify-specific headers (e.g. CSP, cache-control) to the response
  addDocumentResponseHeaders(request, responseHeaders);

  // Detect if the request is from a bot (Googlebot, etc.)
  const userAgent = request.headers.get("user-agent");
  const callbackName = isbot(userAgent ?? "") ? "onAllReady" : "onShellReady";

  // Return a promise that resolves when React finishes streaming
  return new Promise((resolve, reject) => {
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} />,
      {
        [callbackName]: () => {
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          console.log(
            `🚦 Stream ready, sending response with status ${responseStatusCode}`,
          );

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },

        onShellError(error) {
          console.error("❌ Shell error:", error);
          reject(error);
        },

        onError(error) {
          responseStatusCode = 500;
          console.error("🔥 React rendering error:", error);
        },
      },
    );

    setTimeout(() => {
      console.warn("⏳ React render timed out, aborting stream.");
      abort();
    }, streamTimeout + 1000);
  });
}
