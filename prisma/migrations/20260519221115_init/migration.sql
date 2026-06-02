-- CreateTable
CREATE TABLE "IndexedFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "objectKey" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "folderPath" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "lastModified" DATETIME NOT NULL,
    "contentType" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "IndexedFile_objectKey_key" ON "IndexedFile"("objectKey");
