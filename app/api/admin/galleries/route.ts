import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { createGalleryRecord, getAdminGalleryById, getAdminGalleryList } from "@/lib/gallery-service";
import { parseGalleryStatus } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  return NextResponse.json({
    galleries: await getAdminGalleryList(),
  });
}

export async function POST(request: Request) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null) as {
    title?: string;
    clientName?: string | null;
    clientEmail?: string | null;
    description?: string | null;
    status?: string;
    allowDownload?: boolean;
    expiresAt?: string | null;
  } | null;

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const gallery = await createGalleryRecord({
    title,
    clientName: body?.clientName?.trim() || null,
    clientEmail: body?.clientEmail?.trim() || null,
    description: body?.description?.trim() || null,
    status: parseGalleryStatus(body?.status),
    allowDownload: body?.allowDownload ?? true,
    expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
  });

  return NextResponse.json({
    gallery: await getAdminGalleryById(gallery.id),
  }, { status: 201 });
}
