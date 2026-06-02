import { GetObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { client, s3Config } from "./s3";

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 80;
const MAX_IMAGE_SIZE = 100 * 1024 * 1024;
const SHARP_CONCURRENCY = 4;

sharp.concurrency(SHARP_CONCURRENCY);

function getThumbDir(): string {
  if (process.env.THUMBNAIL_DIR) {
    return process.env.THUMBNAIL_DIR;
  }

  return process.env.VERCEL ? "/tmp/b2-gallery-thumbs" : "./storage/thumbs";
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex").substring(0, 32);
}

function getThumbPath(objectKey: string): string {
  const baseDir = path.resolve(getThumbDir());
  const hash = hashKey(objectKey);
  const thumbPath = path.resolve(baseDir, `${hash}.webp`);

  if (!thumbPath.startsWith(baseDir + path.sep) && thumbPath !== baseDir) {
    throw new Error("Path traversal detected");
  }

  return thumbPath;
}

async function ensureThumbDir() {
  await fs.mkdir(getThumbDir(), { recursive: true });
}

const inflight = new Map<string, Promise<Buffer>>();

export async function getThumbnailBuffer(objectKey: string): Promise<Buffer> {
  const thumbPath = getThumbPath(objectKey);

  const cached = inflight.get(thumbPath);
  if (cached) return cached;

  const promise = generateThumbnail(objectKey, thumbPath).finally(() => {
    inflight.delete(thumbPath);
  });

  inflight.set(thumbPath, promise);
  return promise;
}

async function generateThumbnail(objectKey: string, thumbPath: string): Promise<Buffer> {
  try {
    await fs.access(thumbPath);
    return await fs.readFile(thumbPath);
  } catch {
    // not cached, generate
  }

  await ensureThumbDir();

  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: objectKey,
  });

  const response = await client.send(command);
  const body = response.Body;

  if (!body) {
    throw new Error("Empty response body from S3");
  }

  const contentLength = response.ContentLength ?? 0;
  if (contentLength > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${contentLength} bytes`);
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of body as AsyncIterable<Buffer>) {
    totalSize += chunk.length;
    if (totalSize > MAX_IMAGE_SIZE) {
      throw new Error(`Image stream exceeded ${MAX_IMAGE_SIZE} bytes`);
    }
    chunks.push(chunk);
  }

  const imageBuffer = Buffer.concat(chunks);

  const metadata = await sharp(imageBuffer).metadata();
  if (metadata.format && !["jpeg", "jpg"].includes(metadata.format)) {
    throw new Error(`Unsupported format: ${metadata.format}`);
  }

  const thumbBuffer = await sharp(imageBuffer)
    .resize(THUMB_WIDTH, null, {
      withoutEnlargement: true,
      fit: "inside",
    })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();

  await fs.writeFile(thumbPath, thumbBuffer);

  return thumbBuffer;
}
