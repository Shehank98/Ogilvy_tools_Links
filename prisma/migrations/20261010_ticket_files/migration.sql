-- CreateTable
CREATE TABLE "TicketFile" (
    "id" TEXT NOT NULL,
    "feedbackId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TicketFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketFile_feedbackId_idx" ON "TicketFile"("feedbackId");

-- CreateIndex
CREATE INDEX "TicketFile_deletedAt_idx" ON "TicketFile"("deletedAt");

-- AddForeignKey
ALTER TABLE "TicketFile" ADD CONSTRAINT "TicketFile_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE ON UPDATE CASCADE;

