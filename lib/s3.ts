import { S3Client, ListObjectsV2Command, GetObjectCommand, ListObjectsV2CommandInput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.B2_REGION || "us-west-000",
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_APPLICATION_KEY_ID || "",
    secretAccessKey: process.env.B2_APPLICATION_KEY || "",
  },
  forcePathStyle: false,
});

export { client };

export async function listAllObjects(
  onPage: (objects: Array<{
    Key: string;
    Size: number;
    LastModified: Date;
  }>, continuationToken?: string) => Promise<void>
): Promise<void> {
  let continuationToken: string | undefined;

  do {
    const input: ListObjectsV2CommandInput = {
      Bucket: process.env.B2_BUCKET_NAME,
      ContinuationToken: continuationToken,
    };

    const command = new ListObjectsV2Command(input);
    const response = await client.send(command);

    if (response.Contents && response.Contents.length > 0) {
      const objects = response.Contents.map((obj) => ({
        Key: obj.Key!,
        Size: obj.Size || 0,
        LastModified: obj.LastModified || new Date(),
      }));

      await onPage(objects, continuationToken);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);
}

export async function generatePresignedUrl(objectKey: string, expiresIn = 600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn });
}