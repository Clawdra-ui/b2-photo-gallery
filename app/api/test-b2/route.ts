import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { s3Client, s3Config, validateB2Env } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const missing = validateB2Env();
  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      error: "Missing environment variables",
      missing,
    }, { status: 400 });
  }

  try {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: s3Config.bucket,
      MaxKeys: 5,
    }));

    return NextResponse.json({
      success: true,
      bucket: s3Config.bucket,
      endpoint: s3Config.endpoint,
      region: s3Config.region,
      objectCount: response.Contents?.length ?? 0,
      truncated: response.IsTruncated ?? false,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "B2 connection failed",
    }, { status: 500 });
  }
}
