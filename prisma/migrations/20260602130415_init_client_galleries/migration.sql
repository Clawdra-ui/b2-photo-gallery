-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "clientName" TEXT,
    "clientEmail" TEXT,
    "accessKey" TEXT NOT NULL,
    "description" TEXT,
    "status" "GalleryStatus" NOT NULL DEFAULT 'DRAFT',
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "coverPhotoId" TEXT,
    "b2Prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "b2Key" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalRelativePath" TEXT,
    "folderPath" TEXT,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "contentType" TEXT NOT NULL,
    "etag" TEXT,
    "sortOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_accessKey_key" ON "Gallery"("accessKey");

-- CreateIndex
CREATE UNIQUE INDEX "Gallery_b2Prefix_key" ON "Gallery"("b2Prefix");

-- CreateIndex
CREATE INDEX "Gallery_slug_idx" ON "Gallery"("slug");

-- CreateIndex
CREATE INDEX "Gallery_status_idx" ON "Gallery"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_b2Key_key" ON "Photo"("b2Key");

-- CreateIndex
CREATE INDEX "Photo_galleryId_sortOrder_idx" ON "Photo"("galleryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Photo_galleryId_createdAt_idx" ON "Photo"("galleryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_coverPhotoId_fkey" FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "Gallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
