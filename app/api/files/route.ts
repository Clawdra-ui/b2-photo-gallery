import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDeliveryFolder, isValidObjectKey } from "@/lib/utils";
import { FileFilter } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get("search") || "";
  const folder = searchParams.get("folder") || "";
  const sortBy = (searchParams.get("sortBy") || "newest") as FileFilter["sortBy"];
  const deliveryOnly = searchParams.get("deliveryOnly") === "true";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "48", 10)));

  if (folder && !isValidObjectKey(folder)) {
    return NextResponse.json({ error: "Invalid folder path" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { filename: { contains: search } },
      { objectKey: { contains: search } },
    ];
  }

  if (folder) {
    where.folderPath = { startsWith: folder };
  }

  if (deliveryOnly) {
    where.folderPath = {
      ...(where.folderPath as object || {}),
      contains: "DELIVERY",
    };
  }

  const orderBy: Record<string, unknown> = {};
  switch (sortBy) {
    case "oldest":
      orderBy.lastModified = "asc";
      break;
    case "name":
      orderBy.filename = "asc";
      break;
    case "size":
      orderBy.size = "desc";
      break;
    default:
      orderBy.lastModified = "desc";
  }

  const [files, total] = await Promise.all([
    prisma.indexedFile.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.indexedFile.count({ where }),
  ]);

  return NextResponse.json({
    files,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}