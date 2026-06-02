import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createPresignedGetUrl } from "@/lib/s3";
import { isExpired } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const photo = await prisma.photo.findUnique({
    where: { id },
    include: { gallery: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const adminAccess = await isAdminAuthenticated();
  const accessKey = request.nextUrl.searchParams.get("accessKey");

  if (!adminAccess) {
    if (!accessKey || photo.gallery.accessKey !== accessKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (photo.gallery.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (isExpired(photo.gallery.expiresAt)) {
      return NextResponse.json({ error: "Gallery expired" }, { status: 410 });
    }
  }

  return NextResponse.json({
    url: await createPresignedGetUrl(photo.b2Key),
  });
}
