import crypto from "crypto";
import type { GalleryStatus } from "./types";

const MAX_OBJECT_KEY_LENGTH = 1024;
const DEFAULT_GALLERY_PREFIX = "client-galleries";

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "gallery";
}

export function generateAccessKey(length = 24): string {
  return crypto.randomBytes(Math.ceil(length)).toString("base64url").slice(0, length);
}

export function parseGalleryStatus(value: string | null | undefined): GalleryStatus {
  switch ((value || "").toUpperCase()) {
    case "PUBLISHED":
      return "PUBLISHED";
    case "ARCHIVED":
      return "ARCHIVED";
    default:
      return "DRAFT";
  }
}

export function galleryPrefixRoot(): string {
  return sanitizePathSegment(process.env.CLIENT_GALLERY_PREFIX || DEFAULT_GALLERY_PREFIX);
}

export function buildGalleryPrefix(slug: string, galleryId: string): string {
  return `${galleryPrefixRoot()}/${slug}-${galleryId}`;
}

export function buildPublicGalleryUrl(accessKey: string): string {
  const base = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}/g/${accessKey}`;
}

export function sanitizePathSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== "." && part !== "..")
    .join("-");
}

export function sanitizeRelativePath(value: string | null | undefined): string {
  const raw = (value || "").replace(/\\/g, "/").trim();
  const segments = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== "." && segment !== "..")
    .map((segment) => segment.replace(/[\x00-\x1f\x7f]/g, "").replace(/[<>:"|?*]/g, "-"));

  const safe = segments.join("/");

  if (!safe || safe.length > MAX_OBJECT_KEY_LENGTH) {
    throw new Error("Invalid relative path");
  }

  return safe;
}

export function sanitizeFilename(value: string): string {
  const safe = sanitizeRelativePath(value).split("/").pop() || "";

  if (!safe) {
    throw new Error("Invalid filename");
  }

  return safe;
}

export function inferFolderPath(relativePath: string | null | undefined): string | null {
  const safe = relativePath ? sanitizeRelativePath(relativePath) : "";
  const lastSlash = safe.lastIndexOf("/");
  return lastSlash > 0 ? safe.slice(0, lastSlash) : null;
}

export function extractFilename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

export function stripPrefix(objectKey: string, prefix: string): string {
  const normalizedPrefix = prefix.replace(/\/+$/, "");
  return objectKey.startsWith(`${normalizedPrefix}/`)
    ? objectKey.slice(normalizedPrefix.length + 1)
    : objectKey;
}

export function isValidObjectKey(key: string): boolean {
  if (!key || key.length > MAX_OBJECT_KEY_LENGTH) return false;
  if (key.startsWith("/") || key.includes("..")) return false;
  if (/[\x00-\x1f\x7f]/.test(key)) return false;
  return true;
}

export function assertValidObjectKey(key: string): string {
  if (!isValidObjectKey(key)) {
    throw new Error("Invalid object key");
  }

  return key;
}

export function isJpegFile(name: string): boolean {
  return /\.(jpe?g)$/i.test(name);
}

export function assertJpegFile(name: string): string {
  if (!isJpegFile(name)) {
    throw new Error("Only JPG and JPEG files are allowed");
  }

  return name;
}

export function isExpired(expiresAt: Date | null | undefined): boolean {
  return Boolean(expiresAt && expiresAt.getTime() < Date.now());
}

export function adminCookieName(): string {
  return "b2_gallery_admin";
}
