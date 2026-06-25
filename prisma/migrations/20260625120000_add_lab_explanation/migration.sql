-- CreateTable
CREATE TABLE "LabExplanation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "testKey" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "LabExplanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LabExplanation_testKey_key" ON "LabExplanation"("testKey");
