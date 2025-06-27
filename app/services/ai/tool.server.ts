/**
 * Tool Service
 * Manages tool execution and processing
 */
import { saveMessage } from "app/lib/db.server";
import AppConfig from "./config.server";

// Constants
const TOOL_ERROR_TYPES = {
  AUTH_REQUIRED: "auth_required",
};

const MESSAGE_TYPES = {
  AUTH_REQUIRED: "auth_required",
};

const MESSAGE_ROLES = {
  USER: "user",
};

const CONTENT_TYPES = {
  TOOL_RESULT: "tool_result",
};

/**
 * Tool Service Class
 */
class ToolService {
  /**
   * Handles tool error responses
   */
  async handleToolError(
    toolUseResponse,
    toolName,
    toolUseId,
    conversationHistory,
    sendMessage,
    conversationId,
  ) {
    const { error } = toolUseResponse;

    if (error.type === TOOL_ERROR_TYPES.AUTH_REQUIRED) {
      console.log("Auth required for tool:", toolName);
      sendMessage({ type: MESSAGE_TYPES.AUTH_REQUIRED });
    } else {
      console.log("Tool use error", error);
    }

    await this.addToolResultToHistory(
      conversationHistory,
      toolUseId,
      error.data,
      conversationId,
    );
  }

  /**
   * Handles successful tool responses
   */
  async handleToolSuccess(
    toolUseResponse,
    toolName,
    toolUseId,
    conversationHistory,
    productsToDisplay,
    conversationId,
  ) {
    // Handle product search results
    if (toolName === AppConfig.tools.productSearchName) {
      const products = this.processProductSearchResult(toolUseResponse);
      productsToDisplay.push(...products);
    }

    // Extract content from response
    const content = this._extractContentFromResponse(toolUseResponse);
    await this.addToolResultToHistory(
      conversationHistory,
      toolUseId,
      content,
      conversationId,
    );
  }

  /**
   * Processes product search results
   */
  processProductSearchResult(toolUseResponse) {
    try {
      console.log("Processing product search result");

      const responseData = this._parseResponseData(toolUseResponse);

      if (!responseData?.products || !Array.isArray(responseData.products)) {
        return [];
      }

      const products = responseData.products
        .slice(0, AppConfig.tools.maxProductsToDisplay)
        .map((product) => this._formatProductData(product));

      console.log(`Found ${products.length} products to display`);
      return products;
    } catch (error) {
      console.error("Error processing product search results:", error);
      return [];
    }
  }

  /**
   * Adds tool result to conversation history
   */
  async addToolResultToHistory(
    conversationHistory,
    toolUseId,
    content,
    conversationId,
  ) {
    const toolResultMessage = {
      role: MESSAGE_ROLES.USER,
      content: [
        {
          type: CONTENT_TYPES.TOOL_RESULT,
          tool_use_id: toolUseId,
          content: this._serializeContent(content),
        },
      ],
    };

    // Add to in-memory history
    conversationHistory.push(toolResultMessage);

    // Save to database
    if (conversationId) {
      await this._saveToDatabase(conversationId, toolResultMessage);
    }
  }

  /**
   * Extracts content from tool response
   */
  _extractContentFromResponse(toolUseResponse) {
    return toolUseResponse.result || toolUseResponse.content;
  }

  /**
   * Parses response data from various formats
   */
  _parseResponseData(toolUseResponse) {
    // Try content first
    if (toolUseResponse.content) {
      return this._parseContent(toolUseResponse.content);
    }

    // Try result
    if (toolUseResponse.result) {
      return this._parseResult(toolUseResponse.result);
    }

    return null;
  }

  /**
   * Parses content field
   */
  _parseContent(content) {
    if (Array.isArray(content) && content.length > 0) {
      const firstContent = content[0].text;
      return typeof firstContent === "object"
        ? firstContent
        : JSON.parse(firstContent);
    }

    if (typeof content === "string") {
      return JSON.parse(content);
    }

    if (typeof content === "object") {
      return content;
    }

    return null;
  }

  /**
   * Parses result field
   */
  _parseResult(result) {
    return typeof result === "string" ? JSON.parse(result) : result;
  }

  /**
   * Formats product data for display
   */
  _formatProductData(product) {
    return {
      id:
        product.product_id ||
        `product-${Math.random().toString(36).substring(7)}`,
      title: product.title || "Product",
      price: this._formatPrice(product),
      image_url: product.image_url || "",
      description: product.description || "",
      url: product.url || "",
    };
  }

  /**
   * Formats product price
   */
  _formatPrice(product) {
    if (product.price_range) {
      return `${product.price_range.currency} ${product.price_range.min}`;
    }

    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0];
      return `${variant.currency} ${variant.price}`;
    }

    return "Price not available";
  }

  /**
   * Serializes content for storage
   */
  _serializeContent(content) {
    return typeof content === "string" ? content : JSON.stringify(content);
  }

  /**
   * Saves message to database
   */
  async _saveToDatabase(conversationId, toolResultMessage) {
    try {
      await saveMessage(
        conversationId,
        MESSAGE_ROLES.USER,
        JSON.stringify(toolResultMessage.content),
      );
    } catch (error) {
      console.error("Error saving tool result to database:", error);
    }
  }
}

/**
 * Creates a tool service instance
 * @returns {Object} Tool service with methods for managing tools
 */
export function createToolService() {
  const service = new ToolService();

  return {
    handleToolError: service.handleToolError.bind(service),
    handleToolSuccess: service.handleToolSuccess.bind(service),
    processProductSearchResult:
      service.processProductSearchResult.bind(service),
    addToolResultToHistory: service.addToolResultToHistory.bind(service),
  };
}

export default {
  createToolService,
};
