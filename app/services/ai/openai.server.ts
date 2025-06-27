/**
 * OpenAI Service
 * Manages interactions with the OpenAI API with Claude-compatible interface
 */
import OpenAI from "openai";
import AppConfig from "./config.server";
import systemPrompts from "app/prompts/prompts.json";

// Constants
const DEFAULT_MODEL = "gpt-4-turbo-preview";
const TOOL_CHOICE_AUTO = "auto";

/**
 * Message content types for type safety
 */
const CONTENT_TYPES = {
  TEXT: "text",
  TOOL_USE: "tool_use",
  TOOL_RESULT: "tool_result",
};

const MESSAGE_ROLES = {
  USER: "user",
  ASSISTANT: "assistant",
  TOOL: "tool",
  SYSTEM: "system",
};

const STOP_REASONS = {
  TOOL_USE: "tool_use",
  END_TURN: "end_turn",
};

/**
 * Tool format converters
 */
class ToolConverter {
  /**
   * Converts Claude tool format to OpenAI tool format
   */
  static toOpenAI(claudeTools) {
    if (!Array.isArray(claudeTools)) return undefined;

    return claudeTools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema,
      },
    }));
  }
}

/**
 * Message format converters
 */
class MessageConverter {
  /**
   * Converts messages to OpenAI format while preserving Claude compatibility
   */
  static toOpenAI(messages) {
    const result = [];

    for (const message of messages) {
      switch (message.role) {
        case MESSAGE_ROLES.USER:
          this._convertUserMessage(message, result);
          break;
        case MESSAGE_ROLES.ASSISTANT:
          this._convertAssistantMessage(message, result);
          break;
        case MESSAGE_ROLES.TOOL:
          result.push(message); // Already in OpenAI format
          break;
      }
    }

    return result;
  }

  /**
   * Converts user message content
   */
  static _convertUserMessage(message, result) {
    if (Array.isArray(message.content)) {
      let textContent = "";

      for (const content of message.content) {
        if (content.type === CONTENT_TYPES.TEXT) {
          textContent += content.text;
        } else if (content.type === CONTENT_TYPES.TOOL_RESULT) {
          result.push({
            role: MESSAGE_ROLES.TOOL,
            tool_call_id: content.tool_use_id,
            content: this._serializeContent(content.content),
          });
        }
      }

      if (textContent) {
        result.push({
          role: MESSAGE_ROLES.USER,
          content: textContent,
        });
      }
    } else {
      result.push({
        role: MESSAGE_ROLES.USER,
        content: message.content,
      });
    }
  }

  /**
   * Converts assistant message content
   */
  static _convertAssistantMessage(message, result) {
    if (Array.isArray(message.content)) {
      let textContent = "";
      const toolCalls = [];

      for (const content of message.content) {
        if (content.type === CONTENT_TYPES.TEXT) {
          textContent += content.text;
        } else if (content.type === CONTENT_TYPES.TOOL_USE) {
          toolCalls.push({
            id: content.id,
            type: "function",
            function: {
              name: content.name,
              arguments: JSON.stringify(content.input),
            },
          });
        }
      }

      const assistantMessage = {
        role: MESSAGE_ROLES.ASSISTANT,
        content: textContent || null,
      };

      if (toolCalls.length > 0) {
        assistantMessage.tool_calls = toolCalls;
      }

      result.push(assistantMessage);
    } else {
      result.push({
        role: MESSAGE_ROLES.ASSISTANT,
        content: message.content,
      });
    }
  }

  /**
   * Serializes content for tool results
   */
  static _serializeContent(content) {
    return typeof content === "string" ? content : JSON.stringify(content);
  }
}

/**
 * Stream response processor
 */
class StreamProcessor {
  constructor(streamHandlers) {
    this.handlers = streamHandlers;
    this.currentTextContent = "";
    this.toolCalls = new Map();
    this.hasToolCalls = false;
  }

  /**
   * Processes a stream chunk
   */
  processChunk(chunk) {
    const delta = chunk.choices[0]?.delta;
    const finishReason = chunk.choices[0]?.finish_reason;

    if (!delta) return { shouldContinue: true };

    this._handleTextContent(delta);
    this._handleToolCalls(delta);

    return { shouldContinue: !finishReason };
  }

  /**
   * Handles text content from stream
   */
  _handleTextContent(delta) {
    if (!delta.content) return;

    this.currentTextContent += delta.content;

    // Emit text chunk
    if (this.handlers.onText) {
      this.handlers.onText(delta.content);
    }

    // Emit content block
    if (this.handlers.onContentBlock) {
      this.handlers.onContentBlock({
        type: CONTENT_TYPES.TEXT,
        text: delta.content,
      });
    }
  }

  /**
   * Handles tool calls from stream
   */
  _handleToolCalls(delta) {
    if (!delta.tool_calls) return;

    this.hasToolCalls = true;

    for (const toolCallDelta of delta.tool_calls) {
      const index = toolCallDelta.index;

      this._initializeToolCall(index);
      this._updateToolCall(index, toolCallDelta);
    }
  }

  /**
   * Initializes a tool call if it doesn't exist
   */
  _initializeToolCall(index) {
    if (!this.toolCalls.has(index)) {
      this.toolCalls.set(index, {
        id: "",
        type: "function",
        function: {
          name: "",
          arguments: "",
        },
      });
    }
  }

  /**
   * Updates tool call with delta data
   */
  _updateToolCall(index, toolCallDelta) {
    const toolCall = this.toolCalls.get(index);

    if (toolCallDelta.id) {
      toolCall.id = toolCallDelta.id;
    }
    if (toolCallDelta.function?.name) {
      toolCall.function.name = toolCallDelta.function.name;
    }
    if (toolCallDelta.function?.arguments) {
      toolCall.function.arguments += toolCallDelta.function.arguments;
    }
  }

  /**
   * Builds final message in Claude format
   */
  buildFinalMessage() {
    const finalMessage = {
      role: MESSAGE_ROLES.ASSISTANT,
      content: [],
    };

    // Add text content
    if (this.currentTextContent) {
      finalMessage.content.push({
        type: CONTENT_TYPES.TEXT,
        text: this.currentTextContent,
      });
    }

    // Add tool calls in Claude format
    this._addToolCallsToMessage(finalMessage);

    // Set stop reason
    finalMessage.stop_reason = this.hasToolCalls
      ? STOP_REASONS.TOOL_USE
      : STOP_REASONS.END_TURN;

    return finalMessage;
  }

  /**
   * Adds tool calls to final message
   */
  _addToolCallsToMessage(finalMessage) {
    for (const [, toolCall] of this.toolCalls) {
      if (toolCall.id && toolCall.function.name) {
        try {
          const input = toolCall.function.arguments
            ? JSON.parse(toolCall.function.arguments)
            : {};

          finalMessage.content.push({
            type: CONTENT_TYPES.TOOL_USE,
            id: toolCall.id,
            name: toolCall.function.name,
            input: input,
          });
        } catch (error) {
          console.error("Error parsing tool arguments:", error);
          finalMessage.content.push({
            type: CONTENT_TYPES.TOOL_USE,
            id: toolCall.id,
            name: toolCall.function.name,
            input: {},
          });
        }
      }
    }
  }

  /**
   * Processes final message with handlers
   */
  async processFinalMessage(finalMessage) {
    // Call onMessage handler
    if (this.handlers.onMessage) {
      this.handlers.onMessage(finalMessage);
    }

    // Process tool use requests
    if (this.handlers.onToolUse && finalMessage.content) {
      await this._processToolUseRequests(finalMessage.content);
    }
  }

  /**
   * Processes tool use requests
   */
  async _processToolUseRequests(content) {
    for (const contentItem of content) {
      if (contentItem.type === CONTENT_TYPES.TOOL_USE) {
        await this.handlers.onToolUse(contentItem);
      }
    }
  }
}

/**
 * OpenAI Service Class
 */
class OpenAIService {
  constructor(apiKey = process.env.OPENAI_API_KEY) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Streams a conversation with OpenAI - mimics Claude's exact behavior
   */
  async streamConversation(
    { messages, promptType = AppConfig.api.defaultPromptType, tools },
    streamHandlers,
  ) {
    const streamParams = this._buildStreamParams(messages, promptType, tools);
    const stream = await this.openai.chat.completions.create(streamParams);

    const processor = new StreamProcessor(streamHandlers);

    // Process stream chunks
    for await (const chunk of stream) {
      const { shouldContinue } = processor.processChunk(chunk);
      if (!shouldContinue) break;
    }

    // Build and process final message
    const finalMessage = processor.buildFinalMessage();
    await processor.processFinalMessage(finalMessage);

    return finalMessage;
  }

  /**
   * Gets the system prompt content for a given prompt type
   */
  getSystemPrompt(promptType) {
    return (
      systemPrompts.systemPrompts[promptType]?.content ||
      systemPrompts.systemPrompts[AppConfig.api.defaultPromptType].content
    );
  }

  /**
   * Builds stream parameters for OpenAI API
   */
  _buildStreamParams(messages, promptType, tools) {
    const systemInstruction = this.getSystemPrompt(promptType);
    const openaiTools = ToolConverter.toOpenAI(tools);
    const openaiMessages = MessageConverter.toOpenAI(messages);

    const streamParams = {
      model: AppConfig.api.defaultModel || DEFAULT_MODEL,
      max_tokens: AppConfig.api.maxTokens,
      messages: [
        { role: MESSAGE_ROLES.SYSTEM, content: systemInstruction },
        ...openaiMessages,
      ],
      stream: true,
    };

    // Add tools if they exist
    if (openaiTools && openaiTools.length > 0) {
      streamParams.tools = openaiTools;
      streamParams.tool_choice = TOOL_CHOICE_AUTO;
    }

    return streamParams;
  }
}

/**
 * Creates an OpenAI service instance
 * @param {string} apiKey - OpenAI API key
 * @returns {OpenAIService} OpenAI service instance
 */
export function createOpenAIService(apiKey = process.env.OPENAI_API_KEY) {
  const service = new OpenAIService(apiKey);

  return {
    streamConversation: service.streamConversation.bind(service),
    getSystemPrompt: service.getSystemPrompt.bind(service),
  };
}

export default {
  createOpenAIService,
};
