import { NextResponse } from "next/server";
import { client, validateEnv } from "@/lib/s3";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = validateEnv();
  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      error: "Missing environment variables",
      missing,
    }, { status: 400 });
  }

  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.B2_BUCKET_NAME,
      MaxKeys: 5,
    });

    const response = await client.send(command);

    return NextResponse.json({
      success: true,
      bucket: process.env.B2_BUCKET_NAME,
      endpoint: process.env.B2_ENDPOINT,
      region: process.env.B2_REGION,
      objectCount: response.Contents?.length ?? 0,
      truncated: response.IsTruncated ?? false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}