/*
  Warnings:

  - You are about to alter the column `isPublic` on the `Exhibit` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `visibleInGallery` on the `GallerySettings` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to alter the column `isPrimary` on the `MediaResource` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exhibit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "inventoryNumber" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT DEFAULT '',
    "creationDate" TEXT,
    "categoryId" TEXT,
    "studentId" TEXT,
    "supervisorId" TEXT,
    "dimensions" TEXT,
    "currentLocation" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "technicalSpecs" TEXT DEFAULT '{}',
    "interestingFacts" TEXT DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exhibit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exhibit_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Exhibit_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Exhibit" ("categoryId", "createdAt", "creationDate", "currentLocation", "description", "dimensions", "fullDescription", "id", "interestingFacts", "inventoryNumber", "isPublic", "studentId", "supervisorId", "technicalSpecs", "title", "updatedAt") SELECT "categoryId", "createdAt", "creationDate", "currentLocation", "description", "dimensions", "fullDescription", "id", "interestingFacts", "inventoryNumber", "isPublic", "studentId", "supervisorId", "technicalSpecs", "title", "updatedAt" FROM "Exhibit";
DROP TABLE "Exhibit";
ALTER TABLE "new_Exhibit" RENAME TO "Exhibit";
CREATE UNIQUE INDEX "Exhibit_inventoryNumber_key" ON "Exhibit"("inventoryNumber");
CREATE INDEX "Exhibit_categoryId_idx" ON "Exhibit"("categoryId");
CREATE INDEX "Exhibit_studentId_idx" ON "Exhibit"("studentId");
CREATE INDEX "Exhibit_supervisorId_idx" ON "Exhibit"("supervisorId");
CREATE INDEX "Exhibit_isPublic_idx" ON "Exhibit"("isPublic");
CREATE TABLE "new_GallerySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "posX" REAL,
    "posY" REAL,
    "posZ" REAL,
    "scale" REAL DEFAULT 1.0,
    "rotY" REAL DEFAULT 0,
    "visibleInGallery" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "GallerySettings_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_GallerySettings" ("exhibitId", "id", "posX", "posY", "posZ", "rotY", "scale", "visibleInGallery") SELECT "exhibitId", "id", "posX", "posY", "posZ", "rotY", "scale", "visibleInGallery" FROM "GallerySettings";
DROP TABLE "GallerySettings";
ALTER TABLE "new_GallerySettings" RENAME TO "GallerySettings";
CREATE UNIQUE INDEX "GallerySettings_exhibitId_key" ON "GallerySettings"("exhibitId");
CREATE INDEX "GallerySettings_exhibitId_idx" ON "GallerySettings"("exhibitId");
CREATE TABLE "new_MediaResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MediaResource_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_MediaResource" ("exhibitId", "filePath", "fileType", "id", "isPrimary") SELECT "exhibitId", "filePath", "fileType", "id", "isPrimary" FROM "MediaResource";
DROP TABLE "MediaResource";
ALTER TABLE "new_MediaResource" RENAME TO "MediaResource";
CREATE INDEX "MediaResource_exhibitId_idx" ON "MediaResource"("exhibitId");
CREATE TABLE "new_guide_content" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_guide_content" ("content", "id", "updatedAt") SELECT "content", "id", "updatedAt" FROM "guide_content";
DROP TABLE "guide_content";
ALTER TABLE "new_guide_content" RENAME TO "guide_content";
CREATE TABLE "new_page_content" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_page_content" ("content", "id", "updatedAt") SELECT "content", "id", "updatedAt" FROM "page_content";
DROP TABLE "page_content";
ALTER TABLE "new_page_content" RENAME TO "page_content";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
