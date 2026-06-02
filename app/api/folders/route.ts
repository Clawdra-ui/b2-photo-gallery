import { NextResponse } from "next/server";
import { buildFolderList, isDatabaseUnavailableError, listIndexedFilesFromB2 } from "@/lib/live-index";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const files = await prisma.indexedFile.findMany({
      select: { folderPath: true, objectKey: true },
    });

    return NextResponse.json({
      folders: buildFolderList(files),
    });
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) {
      throw err;
    }

    const files = await listIndexedFilesFromB2();

    return NextResponse.json({
      folders: buildFolderList(files),
      source: "b2-live",
    });
  }
}
