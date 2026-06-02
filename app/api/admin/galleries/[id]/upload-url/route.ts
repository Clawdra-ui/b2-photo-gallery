import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createPresignedPutUrl } from "@/lib/s3";
import { isJpegFile, sanitizeFilename, sanitizeRelativePath } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

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
    filename?: string;
    relativePath?: string | null;
    contentType?: string;
    size?: number;
  } | null;

  if (!body?.filename || !body?.contentType || typeof body.size !== "number") {
    return NextResponse.json({ error: "Missing upload metadata" }, { status: 400 });
  }

  if (!/^image\/jpeg$/i.test(body.contentType) || !isJpegFile(body.filename)) {
    return NextResponse.json({ error: "Only JPG and JPEG files are allowed" }, { status: 400 });
  }

  if (body.size <= 0 || body.size > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds the 50 MB limit" }, { status: 400 });
  }

  const relativePath = body.relativePath
    ? sanitizeRelativePath(body.relativePath)
    : sanitizeFilename(body.filename);
  const b2Key = `${gallery.b2Prefix}/originals/${relativePath}`;
  const uploadUrl = await createPresignedPutUrl({
    objectKey: b2Key,
    contentType: body.contentType,
  });

  return NextResponse.json({
    uploadUrl,
    b2Key,
    headersIfNeeded: {
      "Content-Type": body.contentType,
    },
  });
}
