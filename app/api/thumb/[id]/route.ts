import { NextRequest, NextResponse } from "next/server";
import { decodeObjectKeyId, isDatabaseUnavailableError } from "@/lib/live-index";
import { prisma } from "@/lib/prisma";
import { getThumbnailBuffer } from "@/lib/thumbnails";
import { generatePresignedUrl } from "@/lib/s3";
import { isValidObjectKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidObjectKey(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let objectKey: string | null = null;

  try {
    const file = await prisma.indexedFile.findUnique({ where: { id } });
    objectKey = file?.objectKey ?? null;
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) {
      throw err;
    }
  }

  if (!objectKey) {
    objectKey = decodeObjectKeyId(id);
  }

  if (!objectKey) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const thumbBuffer = await getThumbnailBuffer(objectKey);
    return new NextResponse(new Uint8Array(thumbBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    // Fallback: redirect to presigned original
    try {
      const url = await generatePresignedUrl(objectKey, 3600);
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.json(
        { error: "Failed to generate thumbnail" },
        { status: 500 }
      );
    }
  }
}
