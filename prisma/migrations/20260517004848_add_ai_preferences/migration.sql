-- AlterTable
ALTER TABLE "UserPreference" ADD COLUMN     "aiApiKey" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "aiProvider" TEXT NOT NULL DEFAULT '';
