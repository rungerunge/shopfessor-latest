import { generateAuthUrl } from "app/lib/auth.server";
import { getCustomerToken } from "app/lib/db.server";

// Constants
const JSON_RPC_VERSION = "2.0";
const HTTP_STATUS = {
  UNAUTHORIZED: 401,
};

const ERROR_TYPES = {
  AUTH_REQUIRED: "auth_required",
  INTERNAL_ERROR: "internal_error",
};

const METHODS = {
  TOOLS_LIST: "tools/list",
  TOOLS_CALL: "tools/call",
};

/**
 * Client for interacting with Model Context Protocol (MCP) API endpoints.
 * Manages connections to both customer and storefront MCP endpoints, and handles tool invocation.
 */
class MCPClient {
  constructor(hostUrl, conversationId, shopId, customerMcpEndpoint) {
    this.tools = [];
    this.customerTools = [];
    this.storefrontTools = [];

    this.storefrontMcpEndpoint = `${hostUrl}/api/mcp`;
    this.customerMcpEndpoint =
      customerMcpEndpoint || this._buildCustomerEndpoint(hostUrl);

    this.customerAccessToken = "";
    this.conversationId = conversationId;
    this.shopId = shopId;
  }

  /**
   * Connects to the customer MCP server and retrieves available tools
   */
  async connectToCustomerServer() {
    try {
      console.log(`Connecting to MCP server at ${this.customerMcpEndpoint}`);

      await this._loadCustomerToken();

      const headers = this._buildAuthHeaders(this.customerAccessToken);
      const response = await this._makeJsonRpcRequest(
        this.customerMcpEndpoint,
        METHODS.TOOLS_LIST,
        {},
        headers,
      );

      const customerTools = this._extractAndFormatTools(response);
      this._addToolsToCollections(customerTools, "customer");

      return customerTools;
    } catch (error) {
      console.error("Failed to connect to MCP customer server:", error);
      throw error;
    }
  }

  /**
   * Connects to the storefront MCP server and retrieves available tools
   */
  async connectToStorefrontServer() {
    try {
      console.log(`Connecting to MCP server at ${this.storefrontMcpEndpoint}`);

      const headers = this._buildHeaders();
      const response = await this._makeJsonRpcRequest(
        this.storefrontMcpEndpoint,
        METHODS.TOOLS_LIST,
        {},
        headers,
      );

      const storefrontTools = this._extractAndFormatTools(response);
      this._addToolsToCollections(storefrontTools, "storefront");

      return storefrontTools;
    } catch (error) {
      console.error("Failed to connect to MCP storefront server:", error);
      throw error;
    }
  }

  /**
   * Dispatches a tool call to the appropriate MCP server
   */
  async callTool(toolName, toolArgs) {
    if (this._isCustomerTool(toolName)) {
      return this.callCustomerTool(toolName, toolArgs);
    }

    if (this._isStorefrontTool(toolName)) {
      return this.callStorefrontTool(toolName, toolArgs);
    }

    throw new Error(`Tool ${toolName} not found`);
  }

  /**
   * Calls a tool on the storefront MCP server
   */
  async callStorefrontTool(toolName, toolArgs) {
    try {
      console.log("Calling storefront tool", toolName, toolArgs);

      const headers = this._buildHeaders();
      const response = await this._makeJsonRpcRequest(
        this.storefrontMcpEndpoint,
        METHODS.TOOLS_CALL,
        { name: toolName, arguments: toolArgs },
        headers,
      );

      return response.result || response;
    } catch (error) {
      console.error(`Error calling storefront tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Calls a tool on the customer MCP server with auth handling
   */
  async callCustomerTool(toolName, toolArgs) {
    try {
      console.log("Calling customer tool", toolName, toolArgs);

      const accessToken = await this._ensureCustomerToken();
      const headers = this._buildAuthHeaders(accessToken);

      try {
        const response = await this._makeJsonRpcRequest(
          this.customerMcpEndpoint,
          METHODS.TOOLS_CALL,
          { name: toolName, arguments: toolArgs },
          headers,
        );

        return response.result || response;
      } catch (error) {
        if (error.status === HTTP_STATUS.UNAUTHORIZED) {
          return await this._handleAuthRequired();
        }
        throw error;
      }
    } catch (error) {
      console.error(`Error calling customer tool ${toolName}:`, error);
      return this._createErrorResponse(
        ERROR_TYPES.INTERNAL_ERROR,
        `Error calling tool ${toolName}: ${error.message}`,
      );
    }
  }

  /**
   * Builds customer endpoint URL
   */
  _buildCustomerEndpoint(hostUrl) {
    const accountHostUrl = hostUrl.replace(/(\.myshopify\.com)$/, ".account$1");
    return `${accountHostUrl}/customer/api/mcp`;
  }

  /**
   * Loads customer token from database
   */
  async _loadCustomerToken() {
    if (!this.conversationId) return;

    const dbToken = await getCustomerToken(this.conversationId);
    if (dbToken?.accessToken) {
      this.customerAccessToken = dbToken.accessToken;
    } else {
      console.log(
        "No token in database for conversation:",
        this.conversationId,
      );
    }
  }

  /**
   * Ensures we have a customer token
   */
  async _ensureCustomerToken() {
    if (!this.customerAccessToken) {
      await this._loadCustomerToken();
    }
    return this.customerAccessToken;
  }

  /**
   * Builds standard headers
   */
  _buildHeaders() {
    return {
      "Content-Type": "application/json",
    };
  }

  /**
   * Builds headers with authorization
   */
  _buildAuthHeaders(token = "") {
    return {
      ...this._buildHeaders(),
      Authorization: token,
    };
  }

  /**
   * Extracts and formats tools from API response
   */
  _extractAndFormatTools(response) {
    const toolsData = response.result?.tools || [];
    return this._formatToolsData(toolsData);
  }

  /**
   * Adds tools to appropriate collections
   */
  _addToolsToCollections(tools, type) {
    if (type === "customer") {
      this.customerTools = tools;
    } else {
      this.storefrontTools = tools;
    }
    this.tools = [...this.tools, ...tools];
  }

  /**
   * Checks if tool belongs to customer tools
   */
  _isCustomerTool(toolName) {
    return this.customerTools.some((tool) => tool.name === toolName);
  }

  /**
   * Checks if tool belongs to storefront tools
   */
  _isStorefrontTool(toolName) {
    return this.storefrontTools.some((tool) => tool.name === toolName);
  }

  /**
   * Handles authentication required scenario
   */
  async _handleAuthRequired() {
    console.log("Unauthorized, generating authorization URL for customer");

    const authResponse = await generateAuthUrl(
      this.conversationId,
      this.shopId,
    );
    const authMessage = `You need to authorize the app to access your customer data. [Click here to authorize](${authResponse.url})`;

    return this._createErrorResponse(ERROR_TYPES.AUTH_REQUIRED, authMessage);
  }

  /**
   * Creates standardized error response
   */
  _createErrorResponse(type, data) {
    return {
      error: { type, data },
    };
  }

  /**
   * Makes a JSON-RPC request to the specified endpoint
   */
  async _makeJsonRpcRequest(endpoint, method, params, headers) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: JSON_RPC_VERSION,
        method,
        id: 1,
        params,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      const errorObj = new Error(`Request failed: ${response.status} ${error}`);
      errorObj.status = response.status;
      throw errorObj;
    }

    return await response.json();
  }

  /**
   * Formats raw tool data into a consistent format
   */
  _formatToolsData(toolsData) {
    return toolsData.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema || tool.input_schema,
    }));
  }
}

export default MCPClient;
