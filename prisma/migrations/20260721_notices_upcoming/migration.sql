-- CreateEnum
CREATE TYPE "NoticeType" AS ENUM ('INFO', 'UPDATE', 'BUGFIX', 'WARNING');

-- CreateTable
CREATE TABLE "Notice" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NoticeType" NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Upcoming" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bannerUrl" TEXT,
    "description" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Upcoming_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notice_isActive_createdAt_idx" ON "Notice"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "Upcoming_isActive_order_idx" ON "Upcoming"("isActive", "order");
