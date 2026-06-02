import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listAllObjects } from "@/lib/s3";
import { isJpegFile, extractFolderPath, extractFilename, isValidObjectKey } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const existingKeys = new Set<string>();
    const dbFiles = await prisma.indexedFile.findMany({ select: { objectKey: true } });
    for (const f of dbFiles) existingKeys.add(f.objectKey);

    const allKeysCurrent = new Set<string>();
    let totalScanned = 0;
    let totalJpegs = 0;
    let insertedOrUpdated = 0;
    let skipped = 0;
    const errors: string[] = [];

    await listAllObjects(async (objects) => {
      for (const obj of objects) {
        totalScanned++;
        const key = obj.Key;

        if (!isValidObjectKey(key)) {
          skipped++;
          continue;
        }

        if (!isJpegFile(key)) {
          skipped++;
          continue;
        }

        totalJpegs++;
        allKeysCurrent.add(key);

        try {
          await prisma.indexedFile.upsert({
            where: { objectKey: key },
            create: {
              objectKey: key,
              filename: extractFilename(key),
              folderPath: extractFolderPath(key),
              size: obj.Size,
              lastModified: obj.LastModified,
              contentType: "image/jpeg",
            },
            update: {
              size: obj.Size,
              lastModified: obj.LastModified,
              contentType: "image/jpeg",
            },
          });
          insertedOrUpdated++;
        } catch (err) {
          errors.push(`Failed to index ${key}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    // Remove files that no longer exist in B2
    const toDelete = [...existingKeys].filter((k) => !allKeysCurrent.has(k));
    if (toDelete.length > 0) {
      await prisma.indexedFile.deleteMany({
        where: { objectKey: { in: toDelete } },
      });
    }

    return NextResponse.json({
      totalScanned,
      totalJpegs,
      insertedOrUpdated,
      skipped,
      removed: toDelete.length,
      errors: errors.slice(0, 100),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const count = await prisma.indexedFile.count();
  const lastFile = await prisma.indexedFile.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    total: count,
    lastScan: lastFile?.updatedAt || null,
  });
}