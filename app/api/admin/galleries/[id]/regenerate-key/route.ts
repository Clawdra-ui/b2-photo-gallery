import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { getAdminGalleryById, regenerateGalleryAccessKey } from "@/lib/gallery-service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await regenerateGalleryAccessKey(id);

  return NextResponse.json({
    gallery: await getAdminGalleryById(id),
  });
}
