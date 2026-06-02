export type GalleryStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface GalleryListItem {
  id: string;
  title: string;
  slug: string;
  clientName: string | null;
  clientEmail: string | null;
  accessKey: string;
  description: string | null;
  status: GalleryStatus;
  allowDownload: boolean;
  expiresAt: string | null;
  coverPhotoId: string | null;
  b2Prefix: string;
  createdAt: string;
  updatedAt: string;
  photoCount: number;
  publicUrl: string;
}

export interface PhotoRecord {
  id: string;
  galleryId: string;
  b2Key: string;
  filename: string;
  originalRelativePath: string | null;
  folderPath: string | null;
  size: number;
  width: number | null;
  height: number | null;
  contentType: string;
  etag: string | null;
  sortOrder: number | null;
  createdAt: string;
  updatedAt: string;
  previewUrl?: string;
}

export interface GalleryDetail extends GalleryListItem {
  photos: PhotoRecord[];
}

export interface PublicGalleryPayload {
  id: string;
  title: string;
  clientName: string | null;
  description: string | null;
  accessKey: string;
  allowDownload: boolean;
  expiresAt: string | null;
  previewMode: boolean;
  photos: PhotoRecord[];
}

export interface GalleryAccessResult {
  kind: "ok" | "not-found" | "expired" | "unavailable";
  gallery?: PublicGalleryPayload;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  b2Key: string;
  headersIfNeeded: Record<string, string>;
}
