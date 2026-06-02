import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { getPublicGalleryByAccessKey } from "@/lib/gallery-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ accessKey: string }> }
) {
  const { accessKey } = await params;
  const { searchParams } = new URL(request.url);
  const previewMode = searchParams.get("preview") === "1" && await isAdminAuthenticated();
  const result = await getPublicGalleryByAccessKey(accessKey, { previewMode });

  if (result.kind === "not-found") {
    return NextResponse.json({ error: "Gallery not found", kind: result.kind }, { status: 404 });
  }

  if (result.kind === "expired") {
    return NextResponse.json({ error: "Gallery expired", kind: result.kind }, { status: 410 });
  }

  return NextResponse.json({ gallery: result.gallery });
}
