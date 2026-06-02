import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const THUMB_WIDTH = 400;

const s3Client = new S3Client({
  region: process.env.B2_REGION || "us-west-000",
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
  forcePathStyle: false,
});

function getThumbDir(): string {
  return process.env.THUMBNAIL_DIR || "./storage/thumbs";
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 32);
}

function getThumbPath(objectKey: string): string {
  const hash = hashKey(objectKey);
  return path.join(getThumbDir(), `${hash}.webp`);
}

async function ensureThumbDir() {
  const dir = getThumbDir();
  await fs.mkdir(dir, { recursive: true });
}

export async function getThumbnailBuffer(objectKey: string): Promise<Buffer> {
  const thumbPath = getThumbPath(objectKey);

  // Check if thumbnail exists on disk
  try {
    await fs.access(thumbPath);
    return await fs.readFile(thumbPath);
  } catch {
    // Doesn't exist, generate it
  }

  await ensureThumbDir();

  // Fetch from B2
  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: objectKey,
  });

  const response = await s3Client.send(command);
  const body = response.Body;

  if (!body) {
    throw new Error("Empty response body from S3");
  }

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Buffer>) {
    chunks.push(chunk);
  }
  const imageBuffer = Buffer.concat(chunks);

  // Generate WebP thumbnail
  const thumbBuffer = await sharp(imageBuffer)
    .resize(THUMB_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: 80 })
    .toBuffer();

  // Save to disk
  await fs.writeFile(thumbPath, thumbBuffer);

  return thumbBuffer;
}