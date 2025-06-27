/**
 * Chat API Route
 * Handles HTTP requests for chat interactions
 */
import { json } from "@remix-run/node";
import { createChatService } from "app/services/ai/chat.server";
import { createSseStream } from "app/services/ai/streaming.server";
import AppConfig from "app/services/ai/config.server";
import { getCorsHeaders, getSseHeaders } from "app/utils/http-headers";

/**
 * Remix loader function for handling GET requests
 */
export async function loader({ request }: { request: Request }) {
  // Handle OPTIONS requests (CORS preflight)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(request),
    });
  }

  const url = new URL(request.url);

  // Handle history fetch requests - matches /chat?history=true&conversation_id=XYZ
  if (
    url.searchParams.has("history") &&
    url.searchParams.has("conversation_id")
  ) {
    return handleHistoryRequest(
      request,
      url.searchParams.get("conversation_id")!,
    );
  }

  // Handle SSE requests
  if (
    !url.searchParams.has("history") &&
    request.headers.get("Accept") === "text/event-stream"
  ) {
    return handleChatRequest(request);
  }

  // API-only: reject all other requests
  return json(
    { error: AppConfig.errorMessages.apiUnsupported },
    { status: 400, headers: getCorsHeaders(request) },
  );
}

/**
 * Remix action function for handling POST requests
 */
export async function action({ request }: { request: Request }) {
  return handleChatRequest(request);
}

/**
 * Handle history fetch requests
 * @param {Request} request - The request object
 * @param {string} conversationId - The conversation ID
 * @returns {Response} JSON response with chat history
 */
async function handleHistoryRequest(request: Request, conversationId: string) {
  const chatService = createChatService();
  const messages = await chatService.getHistory(conversationId);

  return json({ messages }, { headers: getCorsHeaders(request) });
}

/**
 * Handle chat requests (both GET and POST)
 * @param {Request} request - The request object
 * @returns {Response} Server-sent events stream
 */
async function handleChatRequest(request: Request) {
  try {
    // Get message data from request body
    const body = await request.json();
    const userMessage = body.message;

    // Validate required message
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: AppConfig.errorMessages.missingMessage }),
        { status: 400, headers: getSseHeaders(request) },
      );
    }

    // Generate or use existing conversation ID
    const conversationId = body.conversation_id || Date.now().toString();
    const promptType = body.prompt_type || AppConfig.api.defaultPromptType;

    // Create a stream for the response
    const responseStream = createSseStream(async (stream: any) => {
      const chatService = createChatService();
      await chatService.handleChatSession({
        request,
        userMessage,
        conversationId,
        promptType,
        stream,
      });
    });

    return new Response(responseStream, {
      headers: getSseHeaders(request),
    });
  } catch (error: any) {
    console.error("Error in chat request handler:", error);
    return json(
      { error: error.message },
      {
        status: 500,
        headers: getCorsHeaders(request),
      },
    );
  }
}
