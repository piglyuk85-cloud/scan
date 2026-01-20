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
    "studentName" TEXT,
    "studentCourse" TEXT,
    "studentGroup" TEXT,
    "supervisor" TEXT,
    "supervisorPosition" TEXT,
    "supervisorRank" TEXT,
    "supervisorDepartment" TEXT,
    "dimensions" TEXT,
    "currentLocation" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT NOT NULL,
    "year" TEXT,
    "modelPath" TEXT,
    "has3DModel" BOOLEAN NOT NULL DEFAULT false,
    "previewImage" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "creationInfo" TEXT DEFAULT '',
    "technicalSpecs" TEXT NOT NULL DEFAULT '{}',
    "interestingFacts" TEXT NOT NULL DEFAULT '[]',
    "relatedExhibits" TEXT NOT NULL DEFAULT '[]',
    "galleryPositionX" REAL,
    "galleryPositionY" REAL DEFAULT 0,
    "galleryPositionZ" REAL,
    "galleryScale" REAL DEFAULT 1.0,
    "galleryRotationY" REAL DEFAULT 0,
    "visibleInGallery" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Exhibit" ("category", "createdAt", "creationInfo", "description", "fullDescription", "galleryPositionX", "galleryPositionY", "galleryPositionZ", "galleryRotationY", "galleryScale", "has3DModel", "id", "images", "interestingFacts", "modelPath", "previewImage", "relatedExhibits", "studentCourse", "studentGroup", "studentName", "supervisor", "technicalSpecs", "title", "updatedAt", "visibleInGallery", "year") SELECT "category", "createdAt", "creationInfo", "description", "fullDescription", "galleryPositionX", "galleryPositionY", "galleryPositionZ", "galleryRotationY", "galleryScale", "has3DModel", "id", "images", "interestingFacts", "modelPath", "previewImage", "relatedExhibits", "studentCourse", "studentGroup", "studentName", "supervisor", "technicalSpecs", "title", "updatedAt", "visibleInGallery", "year" FROM "Exhibit";
DROP TABLE "Exhibit";
ALTER TABLE "new_Exhibit" RENAME TO "Exhibit";
CREATE INDEX "Exhibit_category_idx" ON "Exhibit"("category");
CREATE INDEX "Exhibit_year_idx" ON "Exhibit"("year");
CREATE INDEX "Exhibit_studentName_idx" ON "Exhibit"("studentName");
CREATE INDEX "Exhibit_visibleInGallery_idx" ON "Exhibit"("visibleInGallery");
CREATE INDEX "Exhibit_isPublic_idx" ON "Exhibit"("isPublic");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
