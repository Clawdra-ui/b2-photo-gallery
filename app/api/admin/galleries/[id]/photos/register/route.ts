import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { nextPhotoSortOrder } from "@/lib/gallery-service";
import { prisma } from "@/lib/prisma";
import { inferFolderPath, isJpegFile, isValidObjectKey, sanitizeFilename, sanitizeRelativePath } from "@/lib/utils";

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

  const body = await request.json().catch(() => null) as {
    b2Key?: string;
    filename?: string;
    originalRelativePath?: string | null;
    folderPath?: string | null;
    size?: number;
    contentType?: string;
    etag?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;

  if (!body?.b2Key || !body?.filename || typeof body.size !== "number" || !body.contentType) {
    return NextResponse.json({ error: "Missing photo metadata" }, { status: 400 });
  }

  if (!isValidObjectKey(body.b2Key) || !body.b2Key.startsWith(`${gallery.b2Prefix}/originals/`)) {
    return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
  }

  if (!/^image\/jpeg$/i.test(body.contentType)) {
    return NextResponse.json({ error: "Only JPG and JPEG files are allowed" }, { status: 400 });
  }

  if (!isJpegFile(body.filename)) {
    return NextResponse.json({ error: "Only JPG and JPEG files are allowed" }, { status: 400 });
  }

  const originalRelativePath = body.originalRelativePath
    ? sanitizeRelativePath(body.originalRelativePath)
    : sanitizeFilename(body.filename);
  const existingPhoto = await prisma.photo.findUnique({
    where: { b2Key: body.b2Key },
    select: { id: true, galleryId: true },
  });

  if (existingPhoto && existingPhoto.galleryId !== id) {
    return NextResponse.json({ error: "This file is already registered to another gallery" }, { status: 409 });
  }

  const sortOrder = await nextPhotoSortOrder(id);

  const photo = await prisma.photo.upsert({
    where: { b2Key: body.b2Key },
    create: {
      galleryId: id,
      b2Key: body.b2Key,
      filename: sanitizeFilename(body.filename),
      originalRelativePath,
      folderPath: body.folderPath ? sanitizeRelativePath(body.folderPath) : inferFolderPath(originalRelativePath),
      size: body.size,
      width: body.width ?? null,
      height: body.height ?? null,
      contentType: body.contentType,
      etag: body.etag || null,
      sortOrder,
    },
    update: {
      filename: sanitizeFilename(body.filename),
      originalRelativePath,
      folderPath: body.folderPath ? sanitizeRelativePath(body.folderPath) : inferFolderPath(originalRelativePath),
      size: body.size,
      width: body.width ?? null,
      height: body.height ?? null,
      contentType: body.contentType,
      etag: body.etag || null,
    },
  });

  return NextResponse.json({ photo });
}
