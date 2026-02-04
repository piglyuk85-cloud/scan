-- CreateTable: Supervisor
CREATE TABLE "Supervisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "rank" TEXT,
    "department" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- Migrate data: Extract unique supervisors from Exhibit
-- Create a temporary table to generate UUIDs
CREATE TEMPORARY TABLE temp_supervisors AS
SELECT DISTINCT
    "supervisor" as name,
    "supervisorPosition" as position,
    "supervisorRank" as rank,
    "supervisorDepartment" as department
FROM "Exhibit"
WHERE "supervisor" IS NOT NULL AND "supervisor" != '';

-- Insert supervisors with generated UUIDs
INSERT INTO "Supervisor" ("id", "name", "position", "rank", "department", "createdAt", "updatedAt")
SELECT 
    lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))), 2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))) as id,
    name,
    position,
    rank,
    department,
    datetime('now') as "createdAt",
    datetime('now') as "updatedAt"
FROM temp_supervisors;

-- Create unique index on name
CREATE UNIQUE INDEX "Supervisor_name_key" ON "Supervisor"("name");
CREATE INDEX "Supervisor_name_idx" ON "Supervisor"("name");

-- RedefineTables: Add supervisorId to Exhibit
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
    "supervisorId" TEXT,
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
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exhibit_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Supervisor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Migrate data: Copy all fields except supervisor fields, and link to Supervisor
INSERT INTO "new_Exhibit" (
    "id", "inventoryNumber", "title", "description", "fullDescription", "creationDate",
    "studentName", "studentCourse", "studentGroup", "supervisorId",
    "dimensions", "currentLocation", "isPublic", "category", "year",
    "modelPath", "has3DModel", "previewImage", "images", "creationInfo",
    "technicalSpecs", "interestingFacts", "relatedExhibits",
    "galleryPositionX", "galleryPositionY", "galleryPositionZ",
    "galleryScale", "galleryRotationY", "visibleInGallery",
    "createdAt", "updatedAt"
)
SELECT 
    e."id",
    e."inventoryNumber",
    e."title",
    e."description",
    e."fullDescription",
    e."creationDate",
    e."studentName",
    e."studentCourse",
    e."studentGroup",
    s."id" as "supervisorId",
    e."dimensions",
    e."currentLocation",
    e."isPublic",
    e."category",
    e."year",
    e."modelPath",
    e."has3DModel",
    e."previewImage",
    e."images",
    e."creationInfo",
    e."technicalSpecs",
    e."interestingFacts",
    e."relatedExhibits",
    e."galleryPositionX",
    e."galleryPositionY",
    e."galleryPositionZ",
    e."galleryScale",
    e."galleryRotationY",
    e."visibleInGallery",
    e."createdAt",
    e."updatedAt"
FROM "Exhibit" e
LEFT JOIN "Supervisor" s ON 
    e."supervisor" = s."name" AND
    COALESCE(e."supervisorPosition", '') = COALESCE(s."position", '') AND
    COALESCE(e."supervisorRank", '') = COALESCE(s."rank", '') AND
    COALESCE(e."supervisorDepartment", '') = COALESCE(s."department", '');

DROP TABLE "Exhibit";
ALTER TABLE "new_Exhibit" RENAME TO "Exhibit";

-- Recreate indexes
CREATE INDEX "Exhibit_category_idx" ON "Exhibit"("category");
CREATE INDEX "Exhibit_year_idx" ON "Exhibit"("year");
CREATE INDEX "Exhibit_studentName_idx" ON "Exhibit"("studentName");
CREATE INDEX "Exhibit_supervisorId_idx" ON "Exhibit"("supervisorId");
CREATE INDEX "Exhibit_visibleInGallery_idx" ON "Exhibit"("visibleInGallery");
CREATE INDEX "Exhibit_isPublic_idx" ON "Exhibit"("isPublic");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
