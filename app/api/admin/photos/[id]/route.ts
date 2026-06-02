import { NextResponse } from "next/server";
import { assertAdminRequest } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { deleteB2Object } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null) as { sortOrder?: number } | null;

  if (typeof body?.sortOrder !== "number") {
    return NextResponse.json({ error: "sortOrder is required" }, { status: 400 });
  }

  const photo = await prisma.photo.update({
    where: { id },
    data: { sortOrder: Math.max(0, Math.floor(body.sortOrder)) },
  });

  return NextResponse.json({ photo });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await assertAdminRequest();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const photo = await prisma.photo.findUnique({ where: { id } });
  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await deleteB2Object(photo.b2Key).catch(() => null);
  await prisma.photo.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
