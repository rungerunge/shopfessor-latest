import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  QDRANT_URL: z.string(),
  QDRANT_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  MAX_FILE_SIZE: z.coerce.number().default(52428800),
  CHUNK_SIZE: z.coerce.number().default(1000),
  CHUNK_OVERLAP: z.coerce.number().default(200),
  BATCH_SIZE: z.coerce.number().default(50),
  VECTOR_COLLECTION: z.string().default("documents"),
  UPLOAD_DIR: z.string().default("./uploads"),
});

function validateConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    console.error("❌ Invalid environment variables:", error);
    process.exit(1);
  }
}

export const config = validateConfig();
export type Config = z.infer<typeof configSchema>;
