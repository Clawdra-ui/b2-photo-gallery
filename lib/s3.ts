import { S3Client, ListObjectsV2Command, GetObjectCommand, ListObjectsV2CommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function validateEnv() {
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

const client = new S3Client(s3Config);

export { client };
export { validateEnv };

export async function listAllObjects(
  onPage: (objects: Array<{
    Key: string;
    Size: number;
    LastModified: Date;
    ETag?: string;
  }>) => Promise<void>
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const input: ListObjectsV2CommandInput = {
      Bucket: s3Config.bucket,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    };

    const command = new ListObjectsV2Command(input);
    const response = await client.send(command);

    if (response.Contents && response.Contents.length > 0) {
      const objects = response.Contents.map((obj) => ({
        Key: obj.Key!,
        Size: obj.Size || 0,
        LastModified: obj.LastModified || new Date(),
        ETag: obj.ETag,
      }));

      await onPage(objects);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function generatePresignedUrl(objectKey: string, expiresIn?: number): Promise<string> {
  const expires = expiresIn ?? parseInt(process.env.PRESIGNED_URL_EXPIRES_SECONDS || "600", 10);
  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn: expires });
}