-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "profileId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "collectedAt" TIMESTAMP(3),
    "labName" TEXT,
    "notes" TEXT,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LabResult_profileId_collectedAt_idx" ON "LabResult"("profileId", "collectedAt");

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
