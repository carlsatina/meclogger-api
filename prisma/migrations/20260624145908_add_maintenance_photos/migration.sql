-- AlterTable
ALTER TABLE "MaintenanceRecord" ADD COLUMN     "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
