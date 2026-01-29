-- AlterTable
ALTER TABLE "LogbookSaving" ADD COLUMN "option" TEXT NOT NULL DEFAULT 'CASH_IN';

-- AlterTable
ALTER TABLE "LogbookBorrowed" ADD COLUMN "option" TEXT NOT NULL DEFAULT 'BORROW';
