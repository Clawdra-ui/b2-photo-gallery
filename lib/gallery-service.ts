import crypto from "crypto";
import type { Gallery, GalleryStatus as PrismaGalleryStatus, Photo, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { createPresignedGetUrl } from "./s3";
import type {
  GalleryAccessResult,
  GalleryDetail,
  GalleryListItem,
  PhotoRecord,
  PublicGalleryPayload,
} from "./types";
import {
  buildGalleryPrefix,
  buildPublicGalleryUrl,
  extractFilename,
  generateAccessKey,
  inferFolderPath,
  isExpired,
  slugify,
  stripPrefix,
} from "./utils";

const galleryListArgs = {
  orderBy: { createdAt: "desc" as const },
  include: {
    _count: {
      select: { photos: true },
    },
  },
};

const galleryDetailArgs = {
  include: {
    photos: {
      orderBy: [
        { sortOrder: "asc" as const },
        { createdAt: "asc" as const },
      ],
    },
    _count: {
      select: { photos: true },
    },
  },
};

type GalleryListQuery = Prisma.GalleryGetPayload<typeof galleryListArgs>;
type GalleryDetailQuery = Prisma.GalleryGetPayload<typeof galleryDetailArgs>;

function serializePhoto(photo: Photo, previewUrl?: string): PhotoRecord {
  return {
    id: photo.id,
    galleryId: photo.galleryId,
    b2Key: photo.b2Key,
    filename: photo.filename,
    originalRelativePath: photo.originalRelativePath,
    folderPath: photo.folderPath,
    size: photo.size,
    width: photo.width,
    height: photo.height,
    contentType: photo.contentType,
    etag: photo.etag,
    sortOrder: photo.sortOrder,
    createdAt: photo.createdAt.toISOString(),
    updatedAt: photo.updatedAt.toISOString(),
    previewUrl,
  };
}

function serializeGalleryBase(gallery: Gallery) {
  return {
    id: gallery.id,
    title: gallery.title,
    slug: gallery.slug,
    clientName: gallery.clientName,
    clientEmail: gallery.clientEmail,
    accessKey: gallery.accessKey,
    description: gallery.description,
    status: gallery.status as PrismaGalleryStatus,
    allowDownload: gallery.allowDownload,
    expiresAt: gallery.expiresAt?.toISOString() || null,
    coverPhotoId: gallery.coverPhotoId,
    b2Prefix: gallery.b2Prefix,
    createdAt: gallery.createdAt.toISOString(),
    updatedAt: gallery.updatedAt.toISOString(),
  };
}

function serializeGalleryListItem(gallery: GalleryListQuery): GalleryListItem {
  return {
    ...serializeGalleryBase(gallery),
    photoCount: gallery._count.photos,
    publicUrl: buildPublicGalleryUrl(gallery.accessKey),
  };
}

async function attachPreviewUrls(photos: Photo[]) {
  return Promise.all(
    photos.map(async (photo) => serializePhoto(photo, await createPresignedGetUrl(photo.b2Key)))
  );
}

function canAdminPreview(status: PrismaGalleryStatus, previewMode: boolean) {
  return previewMode && status !== "PUBLISHED";
}

export async function getAdminGalleryList() {
  const galleries = await prisma.gallery.findMany(galleryListArgs);
  return galleries.map(serializeGalleryListItem);
}

export async function getAdminGalleryById(id: string): Promise<GalleryDetail | null> {
  const gallery = await prisma.gallery.findUnique({
    ...galleryDetailArgs,
    where: { id },
  });

  if (!gallery) return null;

  return {
    ...serializeGalleryListItem(gallery),
    photos: await attachPreviewUrls(gallery.photos),
  };
}

export async function getPublicGalleryByAccessKey(
  accessKey: string,
  options?: { previewMode?: boolean }
): Promise<GalleryAccessResult> {
  const gallery = await prisma.gallery.findUnique({
    ...galleryDetailArgs,
    where: { accessKey },
  });

  if (!gallery) {
    return { kind: "not-found" };
  }

  const previewMode = Boolean(options?.previewMode);

  if (!previewMode && gallery.status !== "PUBLISHED") {
    return { kind: "not-found" };
  }

  if (!previewMode && isExpired(gallery.expiresAt)) {
    return { kind: "expired" };
  }

  const payload: PublicGalleryPayload = {
    id: gallery.id,
    title: gallery.title,
    clientName: gallery.clientName,
    description: gallery.description,
    accessKey: gallery.accessKey,
    allowDownload: gallery.allowDownload,
    expiresAt: gallery.expiresAt?.toISOString() || null,
    previewMode: canAdminPreview(gallery.status, previewMode),
    photos: await attachPreviewUrls(gallery.photos),
  };

  return { kind: "ok", gallery: payload };
}

export async function createGalleryRecord(input: {
  title: string;
  clientName?: string | null;
  clientEmail?: string | null;
  description?: string | null;
  status?: PrismaGalleryStatus;
  allowDownload?: boolean;
  expiresAt?: Date | null;
}) {
  const slug = slugify(input.title);
  const accessKey = generateAccessKey();
  const galleryId = crypto.randomUUID().replace(/-/g, "");
  const b2Prefix = buildGalleryPrefix(slug, galleryId);

  return prisma.gallery.create({
    data: {
      id: galleryId,
      title: input.title,
      slug,
      clientName: input.clientName || null,
      clientEmail: input.clientEmail || null,
      description: input.description || null,
      status: input.status || "DRAFT",
      allowDownload: input.allowDownload ?? true,
      expiresAt: input.expiresAt || null,
      accessKey,
      b2Prefix,
    },
  });
}

export async function regenerateGalleryAccessKey(id: string) {
  return prisma.gallery.update({
    where: { id },
    data: { accessKey: generateAccessKey() },
  });
}

export async function nextPhotoSortOrder(galleryId: string) {
  const lastPhoto = await prisma.photo.findFirst({
    where: { galleryId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  return (lastPhoto?.sortOrder ?? -1) + 1;
}

export function buildImportedPhotoData(params: {
  galleryId: string;
  galleryPrefix: string;
  b2Key: string;
  size: number;
  etag?: string | null;
  sortOrder: number;
}) {
  const relativePath = stripPrefix(params.b2Key, params.galleryPrefix);

  return {
    galleryId: params.galleryId,
    b2Key: params.b2Key,
    filename: extractFilename(relativePath),
    originalRelativePath: relativePath,
    folderPath: inferFolderPath(relativePath),
    size: params.size,
    contentType: "image/jpeg",
    etag: params.etag || null,
    sortOrder: params.sortOrder,
  };
}
