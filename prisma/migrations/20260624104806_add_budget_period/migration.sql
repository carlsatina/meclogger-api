-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('ONE_TIME', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "period" "BudgetPeriod" NOT NULL DEFAULT 'ONE_TIME';
