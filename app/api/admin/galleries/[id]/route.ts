import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertAdminRequest } from "@/lib/admin";
import { getAdminGalleryById } from "@/lib/gallery-service";
import { parseGalleryStatus, slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const gallery = await getAdminGalleryById(id);

  if (!gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  return NextResponse.json({ gallery });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null) as {
    title?: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
    status?: string;
    allowDownload?: boolean;
    expiresAt?: string | null;
    coverPhotoId?: string | null;
  } | null;

  const existing = await prisma.gallery.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  if (body?.coverPhotoId) {
    const coverPhoto = await prisma.photo.findFirst({
      where: { id: body.coverPhotoId, galleryId: id },
      select: { id: true },
    });

    if (!coverPhoto) {
      return NextResponse.json({ error: "Invalid cover photo" }, { status: 400 });
    }
  }

  await prisma.gallery.update({
    where: { id },
    data: {
      title: typeof body?.title === "string" ? body.title.trim() || existing.title : existing.title,
      slug: typeof body?.title === "string" && body.title.trim() ? slugify(body.title) : existing.slug,
      clientName: body && "clientName" in body ? body.clientName?.trim() || null : existing.clientName,
      clientEmail: body && "clientEmail" in body ? body.clientEmail?.trim() || null : existing.clientEmail,
      description: body && "description" in body ? body.description?.trim() || null : existing.description,
      status: body && "status" in body ? parseGalleryStatus(body.status) : existing.status,
      allowDownload: body && "allowDownload" in body ? body.allowDownload ?? existing.allowDownload : existing.allowDownload,
      expiresAt: body && "expiresAt" in body ? (body.expiresAt ? new Date(body.expiresAt) : null) : existing.expiresAt,
      coverPhotoId: body && "coverPhotoId" in body ? body.coverPhotoId ?? null : existing.coverPhotoId,
    },
  });

  return NextResponse.json({
    gallery: await getAdminGalleryById(id),
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;

  await prisma.gallery.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ success: true });
}
