import { IndexedFile } from "@/lib/types";
import {
  DELIVERY_FOLDERS,
  extractFilename,
  extractFolderPath,
  isJpegFile,
  isValidObjectKey,
} from "@/lib/utils";
import { listAllObjects } from "@/lib/s3";

const LIVE_INDEX_TTL_MS = 30_000;

let cache:
  | {
      expiresAt: number;
      files: IndexedFile[];
    }
  | undefined;
let inflight: Promise<IndexedFile[]> | undefined;

export function shouldPreferLiveIndex(): boolean {
  return process.env.VERCEL === "1" && (process.env.DATABASE_URL || "").startsWith("file:");
}

export function isDatabaseUnavailableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  return [
    "Unable to open the database file",
    "readonly database",
    "attempt to write a readonly database",
  ].some((needle) => err.message.includes(needle));
}

export function encodeObjectKeyId(objectKey: string): string {
  return `k_${Buffer.from(objectKey, "utf8").toString("base64url")}`;
}

export function decodeObjectKeyId(id: string): string | null {
  if (!id.startsWith("k_")) return null;

  try {
    const objectKey = Buffer.from(id.slice(2), "base64url").toString("utf8");
    return isValidObjectKey(objectKey) ? objectKey : null;
  } catch {
    return null;
  }
}

export function buildFolderList(files: Array<Pick<IndexedFile, "folderPath">>): string[] {
  const folders = new Set<string>();

  for (const file of files) {
    if (!file.folderPath) continue;

    const parts = file.folderPath.split("/");
    let acc = "";

    for (const part of parts) {
      acc += (acc ? "/" : "") + part;
      folders.add(acc);
    }
  }

  return [...folders].sort();
}

export async function listIndexedFilesFromB2(forceRefresh = false): Promise<IndexedFile[]> {
  const now = Date.now();

  if (!forceRefresh && cache && cache.expiresAt > now) {
    return cache.files;
  }

  if (!forceRefresh && inflight) {
    return inflight;
  }

  inflight = buildLiveIndex().finally(() => {
    inflight = undefined;
  });

  return inflight;
}

async function buildLiveIndex(): Promise<IndexedFile[]> {
  const files: IndexedFile[] = [];

  await listAllObjects(async (objects) => {
    for (const obj of objects) {
      const key = obj.Key;

      if (!isValidObjectKey(key) || !isJpegFile(key)) {
        continue;
      }

      files.push({
        id: encodeObjectKeyId(key),
        objectKey: key,
        filename: extractFilename(key),
        folderPath: extractFolderPath(key),
        size: obj.Size,
        lastModified: obj.LastModified,
        contentType: "image/jpeg",
      });
    }
  });

  cache = {
    expiresAt: Date.now() + LIVE_INDEX_TTL_MS,
    files,
  };

  return files;
}

export function filterAndSortFiles(
  files: IndexedFile[],
  {
    search,
    folder,
    sortBy,
    deliveryOnly,
  }: {
    search: string;
    folder: string;
    sortBy: "newest" | "oldest" | "name" | "size";
    deliveryOnly: boolean;
  }
): IndexedFile[] {
  const searchValue = search.toLowerCase();

  return files
    .filter((file) => {
      if (searchValue) {
        const haystack = `${file.filename}\n${file.objectKey}`.toLowerCase();
        if (!haystack.includes(searchValue)) return false;
      }

      if (folder && !file.folderPath.startsWith(folder)) {
        return false;
      }

      if (deliveryOnly) {
        const upper = file.folderPath.toUpperCase();
        if (!DELIVERY_FOLDERS.some((kw) => upper.includes(kw))) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime();
        case "name":
          return a.filename.localeCompare(b.filename);
        case "size":
          return b.size - a.size;
        default:
          return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
      }
    });
}

export async function getLiveScanSummary(): Promise<{
  totalScanned: number;
  totalJpegs: number;
  skipped: number;
}> {
  let totalScanned = 0;
  let totalJpegs = 0;
  let skipped = 0;

  await listAllObjects(async (objects) => {
    for (const obj of objects) {
      totalScanned++;
      const key = obj.Key;

      if (!isValidObjectKey(key) || !isJpegFile(key)) {
        skipped++;
        continue;
      }

      totalJpegs++;
    }
  });

  return { totalScanned, totalJpegs, skipped };
}
