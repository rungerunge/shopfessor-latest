import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "./config.server";

const s3 = new S3Client({
  region: config.S3_REGION,
  credentials: {
    accessKeyId: config.S3_ACCESS_KEY_ID,
    secretAccessKey: config.S3_SECRET_ACCESS_KEY,
  },
});

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  // Return the S3 URL (public, or presigned if needed)
  return `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`;
}

export async function deleteFromS3(key: string): Promise<void> {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: config.S3_BUCKET,
        Key: key,
      }),
    );
  } catch (error) {
    console.error(`Failed to delete S3 object with key: ${key}`, error);
    throw error;
  }
}
