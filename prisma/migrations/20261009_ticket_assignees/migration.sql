-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN     "assignedTo" TEXT[] DEFAULT ARRAY[]::TEXT[];

