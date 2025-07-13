import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "app/lib/config.server";
import logger from "app/utils/logger";

const VECTOR_DIMENSIONS = 1536;
const DEFAULT_COLLECTION_CONFIG = {
  vectors: { size: VECTOR_DIMENSIONS, distance: "Cosine" },
  optimizers_config: { default_segment_number: 2 },
  replication_factor: 1,
} as const;

export const qdrantClient = new QdrantClient({
  url: config.QDRANT_URL,
  apiKey: config.QDRANT_API_KEY,
});

export interface DocumentVector {
  id: string;
  vector: number[];
  payload: {
    documentId: string;
    chunkIndex: number;
    text: string;
    tokenCount: number;
    filename: string;
    contentType: string;
    createdAt: string;
  };
}

export async function initializeCollection(): Promise<void> {
  try {
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      (c) => c.name === config.VECTOR_COLLECTION,
    );

    if (!exists) {
      await qdrantClient.createCollection(
        config.VECTOR_COLLECTION,
        DEFAULT_COLLECTION_CONFIG,
      );
      logger.info(`✅ Created Qdrant collection: ${config.VECTOR_COLLECTION}`);
      return;
    }

    // Check dimensions if collection exists
    const collectionInfo = await qdrantClient.getCollection(
      config.VECTOR_COLLECTION,
    );
    const currentSize = collectionInfo.config?.params?.vectors?.size;

    if (currentSize !== VECTOR_DIMENSIONS) {
      logger.warn(
        `⚠️ Existing collection has wrong dimensions (${currentSize}), recreating...`,
      );
      await qdrantClient.deleteCollection(config.VECTOR_COLLECTION);
      await qdrantClient.createCollection(
        config.VECTOR_COLLECTION,
        DEFAULT_COLLECTION_CONFIG,
      );
      logger.info(`✅ Recreated collection: ${config.VECTOR_COLLECTION}`);
    } else {
      logger.info(
        `✅ Collection already exists with correct dimensions: ${config.VECTOR_COLLECTION}`,
      );
    }
  } catch (error) {
    logger.error(`❌ Error initializing Qdrant collection: ${error}`);
    throw error;
  }
}

export async function upsertVectors(vectors: DocumentVector[]): Promise<void> {
  if (vectors.length === 0) return;

  try {
    await qdrantClient.upsert(config.VECTOR_COLLECTION, {
      wait: true,
      points: vectors.map((v) => ({
        id: v.id,
        vector: v.vector,
        payload: v.payload,
      })),
    });
  } catch (error) {
    logger.error(`❌ Error upserting vectors: ${error}`);
    throw error;
  }
}

export async function searchSimilar(
  queryVector: number[],
  limit: number = 10,
  filter?: Record<string, any>,
) {
  try {
    return await qdrantClient.search(config.VECTOR_COLLECTION, {
      vector: queryVector,
      limit,
      with_payload: true,
      ...(filter && { filter }),
    });
  } catch (error) {
    logger.error(`❌ Error searching vectors: ${error}`);
    throw error;
  }
}

export async function deleteDocumentVectors(documentId: string): Promise<void> {
  try {
    await qdrantClient.delete(config.VECTOR_COLLECTION, {
      filter: {
        must: [{ key: "documentId", match: { value: documentId } }],
      },
    });
  } catch (error) {
    logger.error(`❌ Error deleting vectors: ${error}`);
    throw error;
  }
}

export async function getCollectionInfo() {
  try {
    return await qdrantClient.getCollection(config.VECTOR_COLLECTION);
  } catch (error) {
    logger.error(`❌ Error getting collection info: ${error}`);
    throw error;
  }
}
