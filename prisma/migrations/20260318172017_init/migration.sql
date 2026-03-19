-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "page_content" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "guide_content" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "content" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Supervisor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "rank" TEXT,
    "departmentId" TEXT,
    CONSTRAINT "Supervisor_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "course" INTEGER,
    "groupCode" TEXT
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Exhibit" (
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

-- CreateTable
CREATE TABLE "MediaResource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exhibitId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MediaResource_exhibitId_fkey" FOREIGN KEY ("exhibitId") REFERENCES "Exhibit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GallerySettings" (
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

-- CreateIndex
CREATE INDEX "Supervisor_name_idx" ON "Supervisor"("name");

-- CreateIndex
CREATE INDEX "Supervisor_departmentId_idx" ON "Supervisor"("departmentId");

-- CreateIndex
CREATE INDEX "Student_name_idx" ON "Student"("name");

-- CreateIndex
CREATE INDEX "Category_name_idx" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Exhibit_inventoryNumber_key" ON "Exhibit"("inventoryNumber");

-- CreateIndex
CREATE INDEX "Exhibit_categoryId_idx" ON "Exhibit"("categoryId");

-- CreateIndex
CREATE INDEX "Exhibit_studentId_idx" ON "Exhibit"("studentId");

-- CreateIndex
CREATE INDEX "Exhibit_supervisorId_idx" ON "Exhibit"("supervisorId");

-- CreateIndex
CREATE INDEX "Exhibit_isPublic_idx" ON "Exhibit"("isPublic");

-- CreateIndex
CREATE INDEX "MediaResource_exhibitId_idx" ON "MediaResource"("exhibitId");

-- CreateIndex
CREATE UNIQUE INDEX "GallerySettings_exhibitId_key" ON "GallerySettings"("exhibitId");

-- CreateIndex
CREATE INDEX "GallerySettings_exhibitId_idx" ON "GallerySettings"("exhibitId");
