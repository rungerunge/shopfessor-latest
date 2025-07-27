// shared/embedding.server.ts
import OpenAI from "openai";
import pLimit from "p-limit";
import { config } from "app/lib/config.server";
import logger from "app/utils/logger";

const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
const embeddingLimit = pLimit(5);

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log("🧮 🧮 🧮 🧮 🧮 ", text);
  return embeddingLimit(async () => {
    try {
      const response = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text.slice(0, 8000),
      });
      return response.data[0].embedding;
    } catch (error) {
      logger.error("Error generating embedding:", error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  });
}
