import { NextRequest, NextResponse } from "next/server";
import { generatePresignedUrl } from "@/lib/s3";
import { isValidObjectKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  if (!isValidObjectKey(decodedKey)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }

  try {
    const url = await generatePresignedUrl(decodedKey, 600);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate URL" },
      { status: 500 }
    );
  }
}