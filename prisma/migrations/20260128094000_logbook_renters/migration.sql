-- CreateTable
CREATE TABLE "LogbookRenter" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "contactNo" TEXT,
    "email" TEXT,
    "apartment" TEXT,
    "rentalAmount" DOUBLE PRECISION,
    "transferDate" TIMESTAMP(3),
    "remarks" TEXT,

    CONSTRAINT "LogbookRenter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogbookRenter_userId_transferDate_idx" ON "LogbookRenter"("userId", "transferDate");

-- AddForeignKey
ALTER TABLE "LogbookRenter" ADD CONSTRAINT "LogbookRenter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
