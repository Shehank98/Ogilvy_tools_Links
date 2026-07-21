-- AlterTable
ALTER TABLE "Upcoming" ADD COLUMN "voteCount" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "FeedbackTarget" AS ENUM ('TOOL', 'UPCOMING');

-- CreateEnum
CREATE TYPE "FeedbackKind" AS ENUM ('SUGGESTION', 'BUG', 'IDEA');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWING', 'PLANNED', 'DONE', 'DISMISSED');

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "targetType" "FeedbackTarget" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT NOT NULL,
    "kind" "FeedbackKind" NOT NULL DEFAULT 'SUGGESTION',
    "message" TEXT NOT NULL,
    "email" TEXT,
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_targetType_targetId_idx" ON "Feedback"("targetType", "targetId");
