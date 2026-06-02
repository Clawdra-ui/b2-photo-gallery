import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandInput,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { assertValidObjectKey } from "./utils";

export interface ListedObject {
  Key: string;
  Size: number;
  LastModified: Date;
  ETag?: string;
  ContentType?: string;
}

export function validateB2Env() {
  const missing: string[] = [];
  if (!process.env.B2_APPLICATION_KEY_ID) missing.push("B2_APPLICATION_KEY_ID");
  if (!process.env.B2_APPLICATION_KEY) missing.push("B2_APPLICATION_KEY");
  if (!process.env.B2_BUCKET_NAME) missing.push("B2_BUCKET_NAME");
  if (!process.env.B2_ENDPOINT) missing.push("B2_ENDPOINT");
  if (!process.env.B2_REGION) missing.push("B2_REGION");
  return missing;
}

export const s3Config = {
  region: process.env.B2_REGION || "us-west-000",
  endpoint: process.env.B2_ENDPOINT || "",
  bucket: process.env.B2_BUCKET_NAME || "",
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
  forcePathStyle: false,
};

export const s3Client = new S3Client(s3Config);

export async function listObjects(options?: { prefix?: string }): Promise<ListedObject[]> {
  const files: ListedObject[] = [];
  await listObjectsPaged(async (objects) => {
    files.push(...objects);
  }, options);
  return files;
}

export async function listObjectsPaged(
  onPage: (objects: ListedObject[]) => Promise<void>,
  options?: { prefix?: string }
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const input: ListObjectsV2CommandInput = {
      Bucket: s3Config.bucket,
      ContinuationToken: continuationToken,
      Prefix: options?.prefix,
      MaxKeys: 1000,
    };

    const response = await s3Client.send(new ListObjectsV2Command(input));

    if (response.Contents?.length) {
      await onPage(
        response.Contents.map((obj) => ({
          Key: obj.Key || "",
          Size: obj.Size || 0,
          LastModified: obj.LastModified || new Date(),
          ETag: obj.ETag,
        })).filter((obj) => obj.Key)
      );
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
}

export function presignExpirySeconds() {
  return parseInt(process.env.PRESIGNED_URL_EXPIRES_SECONDS || "600", 10);
}

export async function createPresignedGetUrl(objectKey: string, expiresIn = presignExpirySeconds()) {
  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: assertValidObjectKey(objectKey),
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function createPresignedPutUrl(options: {
  objectKey: string;
  contentType: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: assertValidObjectKey(options.objectKey),
    ContentType: options.contentType,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: options.expiresIn ?? presignExpirySeconds(),
  });
}

export async function deleteB2Object(objectKey: string) {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: s3Config.bucket,
    Key: assertValidObjectKey(objectKey),
  }));
}
