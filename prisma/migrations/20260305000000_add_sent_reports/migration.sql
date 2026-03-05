-- CreateTable
CREATE TABLE "SentReport" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "reportData" TEXT NOT NULL,
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "emailsSent" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentReport_sentAt_idx" ON "SentReport"("sentAt" DESC);

-- CreateIndex
CREATE INDEX "SentReport_clientId_idx" ON "SentReport"("clientId");

-- CreateIndex
CREATE INDEX "SentReport_expiresAt_idx" ON "SentReport"("expiresAt");
