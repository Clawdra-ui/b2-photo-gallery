import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const files = await prisma.indexedFile.findMany({
    select: { folderPath: true, objectKey: true },
  });

  const folders = new Set<string>();
  for (const file of files) {
    if (file.folderPath) {
      const parts = file.folderPath.split("/");
      let acc = "";
      for (const part of parts) {
        acc += (acc ? "/" : "") + part;
        folders.add(acc);
      }
    }
  }

  return NextResponse.json({
    folders: [...folders].sort(),
  });
}