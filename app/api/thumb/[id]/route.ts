import { NextRequest, NextResponse } from "next/server";
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

  const file = await prisma.indexedFile.findUnique({ where: { id } });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const thumbBuffer = await getThumbnailBuffer(file.objectKey);
    return new NextResponse(new Uint8Array(thumbBuffer), {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (err) {
    // Fallback: redirect to presigned original
    try {
      const url = await generatePresignedUrl(file.objectKey, 3600);
      return NextResponse.redirect(url);
    } catch {
      return NextResponse.json(
        { error: "Failed to generate thumbnail" },
        { status: 500 }
      );
    }
  }
}