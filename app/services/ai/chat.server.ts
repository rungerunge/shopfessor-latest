/**
 * Chat Service
 * Handles chat sessions, conversation management, and tool integration
 */
import MCPClient from "./mcp-client";
import {
  saveMessage,
  getConversationHistory,
  storeCustomerAccountUrl,
  getCustomerAccountUrl,
} from "app/lib/db.server";
import { createOpenAIService } from "./openai.server";
import { createToolService } from "./tool.server";
import { unauthenticated } from "app/lib/shopify.server";

// ============================================================================
// Types and Interfaces
// ============================================================================

interface ChatSessionParams {
  request: Request;
  userMessage: string;
  conversationId: string;
  promptType: string;
  stream: any;
}

interface ConversationMessage {
  role: string;
  content: any;
}

interface StreamHandlers {
  onText: (textDelta: string) => void;
  onMessage: (message: any) => void;
  onToolUse: (content: any) => Promise<void>;
  onContentBlock?: (contentBlock: any) => void;
}

interface MCPConnectionResult {
  storefrontTools: any[];
  customerTools: any[];
}

// ============================================================================
// Chat Service Class
// ============================================================================

class ChatService {
  private openaiService = createOpenAIService();
  private toolService = createToolService();
  private readonly MAX_ITERATIONS = 10;

  // ============================================================================
  // Public Methods
  // ============================================================================

  async getHistory(conversationId: string): Promise<any[]> {
    return await getConversationHistory(conversationId);
  }

  async getCustomerMcpEndpoint(
    shopDomain: string,
    conversationId: string,
  ): Promise<string | null> {
    try {
      // Check existing URL first
      const existingUrl = await getCustomerAccountUrl(conversationId);
      if (existingUrl) {
        return `${existingUrl}/customer/api/mcp`;
      }

      // Get from Shopify API
      const customerAccountUrl = await this.fetchCustomerAccountUrl(shopDomain);
      if (!customerAccountUrl) {
        return null;
      }

      // Store and return
      await storeCustomerAccountUrl(conversationId, customerAccountUrl);
      return `${customerAccountUrl}/customer/api/mcp`;
    } catch (error) {
      console.error("Error getting customer MCP endpoint:", error);
      return null;
    }
  }

  async handleChatSession(params: ChatSessionParams): Promise<void> {
    const { request, userMessage, conversationId, promptType, stream } = params;

    try {
      // Initialize MCP client
      const mcpClient = await this.initializeMCPClient(request, conversationId);

      // Send conversation ID
      stream.sendMessage({ type: "id", conversation_id: conversationId });

      // Connect to MCP servers
      const mcpConnection = await this.connectToMCPServers(mcpClient);

      // Prepare conversation
      const conversationState = await this.prepareConversation(
        conversationId,
        userMessage,
      );

      // Execute conversation stream
      await this.executeConversationStream(
        conversationState,
        promptType,
        mcpClient,
        stream,
        conversationId,
      );
    } catch (error) {
      throw error; // Let the streaming handler manage errors
    }
  }

  // ============================================================================
  // Private Methods - Initialization
  // ============================================================================

  private async initializeMCPClient(
    request: Request,
    conversationId: string,
  ): Promise<MCPClient> {
    const shopId = request.headers.get("X-Shopify-Shop-Id");
    const shopDomain = request.headers.get("Origin");

    if (!shopId || !shopDomain) {
      throw new Error("Missing required shop information");
    }

    const customerMcpEndpoint = await this.getCustomerMcpEndpoint(
      shopDomain,
      conversationId,
    );

    return new MCPClient(
      shopDomain,
      conversationId,
      shopId,
      customerMcpEndpoint,
    );
  }

  private async connectToMCPServers(
    mcpClient: MCPClient,
  ): Promise<MCPConnectionResult> {
    let storefrontTools: any[] = [];
    let customerTools: any[] = [];

    try {
      storefrontTools = await mcpClient.connectToStorefrontServer();
      customerTools = await mcpClient.connectToCustomerServer();

      console.log(
        `Connected to MCP with ${storefrontTools.length} storefront tools`,
      );
      console.log(
        `Connected to MCP with ${customerTools.length} customer tools`,
      );
    } catch (error: any) {
      console.warn(
        "Failed to connect to MCP servers, continuing without tools:",
        error.message,
      );
    }

    return { storefrontTools, customerTools };
  }

  // ============================================================================
  // Private Methods - Conversation Management
  // ============================================================================

  private async prepareConversation(
    conversationId: string,
    userMessage: string,
  ): Promise<{
    conversationHistory: ConversationMessage[];
    productsToDisplay: any[];
  }> {
    // Save user message
    await saveMessage(conversationId, "user", userMessage);

    // Get conversation history from DB
    const dbMessages = await getConversationHistory(conversationId);

    // Format messages for OpenAI API
    const conversationHistory = this.formatMessagesFromDB(dbMessages);

    return {
      conversationHistory,
      productsToDisplay: [],
    };
  }

  private formatMessagesFromDB(dbMessages: any[]): ConversationMessage[] {
    return dbMessages.map((dbMessage) => {
      let content;
      try {
        content = JSON.parse(dbMessage.content);
      } catch (e) {
        content = dbMessage.content;
      }

      return {
        role: dbMessage.role,
        content,
      };
    });
  }

  // ============================================================================
  // Private Methods - Conversation Execution
  // ============================================================================

  private async executeConversationStream(
    conversationState: {
      conversationHistory: ConversationMessage[];
      productsToDisplay: any[];
    },
    promptType: string,
    mcpClient: MCPClient,
    stream: any,
    conversationId: string,
  ): Promise<void> {
    const { conversationHistory, productsToDisplay } = conversationState;
    let currentIteration = 0;

    while (currentIteration < this.MAX_ITERATIONS) {
      currentIteration++;

      const streamHandlers = this.createStreamHandlers(
        conversationHistory,
        productsToDisplay,
        mcpClient,
        stream,
        conversationId,
      );

      const finalMessage = await this.openaiService.streamConversation(
        {
          messages: conversationHistory,
          promptType,
          tools: (mcpClient as any).tools,
        },
        streamHandlers,
      );

      // Check if conversation should end
      if ((finalMessage as any).stop_reason === "end_turn") {
        break;
      }
    }

    // Send final results
    this.sendFinalResults(stream, productsToDisplay);
  }

  private createStreamHandlers(
    conversationHistory: ConversationMessage[],
    productsToDisplay: any[],
    mcpClient: MCPClient,
    stream: any,
    conversationId: string,
  ): StreamHandlers {
    return {
      onText: (textDelta: string) => {
        stream.sendMessage({ type: "chunk", chunk: textDelta });
      },

      onMessage: (message: any) => {
        this.handleMessageComplete(
          message,
          conversationHistory,
          conversationId,
          stream,
        );
      },

      onToolUse: async (content: any) => {
        await this.handleToolUse(
          content,
          mcpClient,
          conversationHistory,
          productsToDisplay,
          stream,
          conversationId,
        );
      },

      onContentBlock: (contentBlock: any) => {
        if (contentBlock.type === "text") {
          stream.sendMessage({
            type: "content_block_complete",
            content_block: contentBlock,
          });
        }
      },
    };
  }

  // ============================================================================
  // Private Methods - Message and Tool Handling
  // ============================================================================

  private handleMessageComplete(
    message: any,
    conversationHistory: ConversationMessage[],
    conversationId: string,
    stream: any,
  ): void {
    // Add to conversation history
    conversationHistory.push({
      role: message.role,
      content: message.content,
    });

    // Save to database
    this.saveMessageAsync(conversationId, message.role, message.content);

    // Send completion signal
    stream.sendMessage({ type: "message_complete" });
  }

  private async handleToolUse(
    content: any,
    mcpClient: MCPClient,
    conversationHistory: ConversationMessage[],
    productsToDisplay: any[],
    stream: any,
    conversationId: string,
  ): Promise<void> {
    const { name: toolName, input: toolArgs, id: toolUseId } = content;

    // Send tool use notification
    const toolUseMessage = `Calling tool: ${toolName} with arguments: ${JSON.stringify(toolArgs)}`;
    stream.sendMessage({
      type: "tool_use",
      tool_use_message: toolUseMessage,
    });

    // Execute tool
    const toolUseResponse = await mcpClient.callTool(toolName, toolArgs);

    // Handle tool response
    if (toolUseResponse.error) {
      await this.toolService.handleToolError(
        toolUseResponse,
        toolName,
        toolUseId,
        conversationHistory,
        stream.sendMessage,
        conversationId,
      );
    } else {
      await this.toolService.handleToolSuccess(
        toolUseResponse,
        toolName,
        toolUseId,
        conversationHistory,
        productsToDisplay,
        conversationId,
      );
    }

    // Signal new message
    stream.sendMessage({ type: "new_message" });
  }

  // ============================================================================
  // Private Methods - Utilities
  // ============================================================================

  private async fetchCustomerAccountUrl(
    shopDomain: string,
  ): Promise<string | null> {
    const { hostname } = new URL(shopDomain);
    const { storefront } = await unauthenticated.storefront(hostname);

    const response = await storefront.graphql(
      `#graphql
      query shop {
        shop {
          customerAccounts
        }
      }`,
    );

    const body = await response.json();
    return body.data.shop.customerAccounts;
  }

  private saveMessageAsync(
    conversationId: string,
    role: string,
    content: any,
  ): void {
    saveMessage(conversationId, role, JSON.stringify(content)).catch(
      (error) => {
        console.error("Error saving message to database:", error);
      },
    );
  }

  private sendFinalResults(stream: any, productsToDisplay: any[]): void {
    // Signal end of turn
    stream.sendMessage({ type: "end_turn" });

    // Send product results if available
    if (productsToDisplay.length > 0) {
      stream.sendMessage({
        type: "product_results",
        products: productsToDisplay,
      });
    }
  }
}

// ============================================================================
// Factory Function and Export
// ============================================================================

export function createChatService(): {
  getHistory: (conversationId: string) => Promise<any[]>;
  handleChatSession: (params: ChatSessionParams) => Promise<void>;
  getCustomerMcpEndpoint: (
    shopDomain: string,
    conversationId: string,
  ) => Promise<string | null>;
} {
  const service = new ChatService();

  return {
    getHistory: service.getHistory.bind(service),
    handleChatSession: service.handleChatSession.bind(service),
    getCustomerMcpEndpoint: service.getCustomerMcpEndpoint.bind(service),
  };
}
