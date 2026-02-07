-- Add reach/circulation fields to publications and stations
ALTER TABLE "WebPublication" ADD COLUMN IF NOT EXISTS "reach" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WebPublication" ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "TVStation" ADD COLUMN IF NOT EXISTS "reach" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TVStation" ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "reach" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "region" TEXT;

ALTER TABLE "PrintPublication" ADD COLUMN IF NOT EXISTS "circulation" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PrintPublication" ADD COLUMN IF NOT EXISTS "region" TEXT;

-- Create ClientCompetitor table
CREATE TABLE IF NOT EXISTS "ClientCompetitor" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "competitorClientId" TEXT,
    "competitorName" TEXT,
    "competitorKeywords" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCompetitor_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "ClientCompetitor_clientId_competitorClientId_key" ON "ClientCompetitor"("clientId", "competitorClientId");

-- Create index
CREATE INDEX IF NOT EXISTS "ClientCompetitor_clientId_idx" ON "ClientCompetitor"("clientId");

-- Add foreign keys
ALTER TABLE "ClientCompetitor" ADD CONSTRAINT "ClientCompetitor_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCompetitor" ADD CONSTRAINT "ClientCompetitor_competitorClientId_fkey" FOREIGN KEY ("competitorClientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
