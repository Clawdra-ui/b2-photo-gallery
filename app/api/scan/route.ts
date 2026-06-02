import { NextResponse } from "next/server";
import {
  getLiveScanSummary,
  isDatabaseUnavailableError,
  shouldPreferLiveIndex,
} from "@/lib/live-index";
import { prisma } from "@/lib/prisma";
import { listAllObjects, validateEnv } from "@/lib/s3";
import { isJpegFile, extractFolderPath, extractFilename, isValidObjectKey } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 100;

export async function POST() {
  const missing = validateEnv();
  if (missing.length > 0) {
    return NextResponse.json({
      success: false,
      error: "Missing environment variables",
      missing,
    }, { status: 400 });
  }

  if (shouldPreferLiveIndex()) {
    const summary = await getLiveScanSummary();

    return NextResponse.json({
      success: true,
      totalScanned: summary.totalScanned,
      totalJpegs: summary.totalJpegs,
      insertedOrUpdated: 0,
      skipped: summary.skipped,
      removed: 0,
      persisted: false,
      errors: ["Database unavailable in this environment; returned live B2 results only."],
    });
  }

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

    let batch: Array<{
      objectKey: string;
      filename: string;
      folderPath: string;
      size: number;
      lastModified: Date;
      contentType: string;
    }> = [];

    async function flushBatch() {
      if (batch.length === 0) return;
      const records = batch;
      batch = [];
      try {
        await prisma.$transaction(
          records.map((r) =>
            prisma.indexedFile.upsert({
              where: { objectKey: r.objectKey },
              create: r,
              update: {
                size: r.size,
                lastModified: r.lastModified,
                contentType: r.contentType,
              },
            })
          )
        );
        insertedOrUpdated += records.length;
      } catch (err) {
        errors.push(`Batch failed (${records.length} records): ${err instanceof Error ? err.message : String(err)}`);
      }
    }

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

        batch.push({
          objectKey: key,
          filename: extractFilename(key),
          folderPath: extractFolderPath(key),
          size: obj.Size,
          lastModified: obj.LastModified,
          contentType: "image/jpeg",
        });

        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
        }
      }
    });

    await flushBatch();

    const toDelete = [...existingKeys].filter((k) => !allKeysCurrent.has(k));
    let removed = 0;
    if (toDelete.length > 0) {
      const result = await prisma.indexedFile.deleteMany({
        where: { objectKey: { in: toDelete } },
      });
      removed = result.count;
    }

    return NextResponse.json({
      success: true,
      totalScanned,
      totalJpegs,
      insertedOrUpdated,
      skipped,
      removed,
      errors: errors.slice(0, 100),
    });
  } catch (err) {
    if (isDatabaseUnavailableError(err)) {
      const summary = await getLiveScanSummary();

      return NextResponse.json({
        success: true,
        totalScanned: summary.totalScanned,
        totalJpegs: summary.totalJpegs,
        insertedOrUpdated: 0,
        skipped: summary.skipped,
        removed: 0,
        persisted: false,
        errors: ["Database unavailable in this environment; returned live B2 results only."],
      });
    }

    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Scan failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  if (shouldPreferLiveIndex()) {
    const summary = await getLiveScanSummary();

    return NextResponse.json({
      total: summary.totalJpegs,
      lastScan: null,
      source: "b2-live",
    });
  }

  try {
    const count = await prisma.indexedFile.count();
    const lastFile = await prisma.indexedFile.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return NextResponse.json({
      total: count,
      lastScan: lastFile?.updatedAt || null,
    });
  } catch (err) {
    if (!isDatabaseUnavailableError(err)) {
      throw err;
    }

    const summary = await getLiveScanSummary();

    return NextResponse.json({
      total: summary.totalJpegs,
      lastScan: null,
      source: "b2-live",
    });
  }
}
