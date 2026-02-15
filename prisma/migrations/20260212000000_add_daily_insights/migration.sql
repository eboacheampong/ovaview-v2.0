-- CreateEnum: Create DailyInsightStatus enum
CREATE TYPE "DailyInsightStatus" AS ENUM ('pending', 'accepted', 'archived');

-- CreateTable: DailyInsight
CREATE TABLE "DailyInsight" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "source" TEXT,
    "industry" TEXT NOT NULL DEFAULT 'general',
    "clientId" TEXT,
    "status" "DailyInsightStatus" NOT NULL DEFAULT 'pending',
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyInsight_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX "DailyInsight_clientId_idx" ON "DailyInsight"("clientId");
CREATE INDEX "DailyInsight_status_idx" ON "DailyInsight"("status");
CREATE INDEX "DailyInsight_scrapedAt_idx" ON "DailyInsight"("scrapedAt" DESC);
CREATE INDEX "DailyInsight_industry_idx" ON "DailyInsight"("industry");
