-- CreateTable
CREATE TABLE "Exhibit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fullDescription" TEXT DEFAULT '',
    "category" TEXT NOT NULL,
    "year" TEXT,
    "studentName" TEXT,
    "studentCourse" TEXT,
    "studentGroup" TEXT,
    "supervisor" TEXT,
    "modelPath" TEXT,
    "has3DModel" BOOLEAN NOT NULL DEFAULT false,
    "previewImage" TEXT,
    "images" TEXT NOT NULL DEFAULT '[]',
    "creationInfo" TEXT DEFAULT '',
    "technicalSpecs" TEXT NOT NULL DEFAULT '{}',
    "interestingFacts" TEXT NOT NULL DEFAULT '[]',
    "relatedExhibits" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "page_content" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Exhibit_category_idx" ON "Exhibit"("category");

-- CreateIndex
CREATE INDEX "Exhibit_year_idx" ON "Exhibit"("year");

-- CreateIndex
CREATE INDEX "Exhibit_studentName_idx" ON "Exhibit"("studentName");
