-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'FAMILY';

-- CreateTable
CREATE TABLE "LogbookSaving" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT,
    "notes" TEXT,

    CONSTRAINT "LogbookSaving_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogbookBorrowed" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "counterparty" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'UNPAID',
    "notes" TEXT,

    CONSTRAINT "LogbookBorrowed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogbookSaving_userId_entryDate_idx" ON "LogbookSaving"("userId", "entryDate");

-- CreateIndex
CREATE INDEX "LogbookBorrowed_userId_entryDate_idx" ON "LogbookBorrowed"("userId", "entryDate");

-- AddForeignKey
ALTER TABLE "LogbookSaving" ADD CONSTRAINT "LogbookSaving_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogbookBorrowed" ADD CONSTRAINT "LogbookBorrowed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
