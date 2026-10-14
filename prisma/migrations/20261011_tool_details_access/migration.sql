-- CreateEnum
CREATE TYPE "ToolVisibility" AS ENUM ('EVERYONE', 'SELECTED');

-- AlterTable
ALTER TABLE "Tool" ADD COLUMN     "about" TEXT,
ADD COLUMN     "advisory" TEXT,
ADD COLUMN     "developedBy" TEXT,
ADD COLUMN     "initiatedBy" TEXT,
ADD COLUMN     "purpose" TEXT,
ADD COLUMN     "subtitle" TEXT,
ADD COLUMN     "team" TEXT,
ADD COLUMN     "visibility" "ToolVisibility" NOT NULL DEFAULT 'EVERYONE';

-- CreateTable
CREATE TABLE "ToolAccess" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolAccess_userId_idx" ON "ToolAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolAccess_toolId_userId_key" ON "ToolAccess"("toolId", "userId");

-- AddForeignKey
ALTER TABLE "ToolAccess" ADD CONSTRAINT "ToolAccess_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolAccess" ADD CONSTRAINT "ToolAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

