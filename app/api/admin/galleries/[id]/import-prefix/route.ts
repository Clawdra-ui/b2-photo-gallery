import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { buildImportedPhotoData, nextPhotoSortOrder } from "@/lib/gallery-service";
import { prisma } from "@/lib/prisma";
import { listObjects } from "@/lib/s3";
import { isJpegFile, sanitizeRelativePath } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const gallery = await prisma.gallery.findUnique({ where: { id } });
  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null) as { prefix?: string } | null;
  const prefix = body?.prefix ? sanitizeRelativePath(body.prefix).replace(/\/+$/, "") : "";

  if (!prefix) {
    return NextResponse.json({ error: "Prefix is required" }, { status: 400 });
  }

  const objects = (await listObjects({ prefix })).filter((object) => isJpegFile(object.Key));
  const startingSortOrder = await nextPhotoSortOrder(id);

  const result = await prisma.photo.createMany({
    data: objects.map((object, index) =>
      buildImportedPhotoData({
        galleryId: id,
        galleryPrefix: prefix,
        b2Key: object.Key,
        size: object.Size,
        etag: object.ETag || null,
        sortOrder: startingSortOrder + index,
      })
    ),
    skipDuplicates: true,
  });

  return NextResponse.json({
    importedCount: result.count,
    scannedCount: objects.length,
  });
}
