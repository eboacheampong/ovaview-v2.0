-- Drop the old unique constraint on url alone
DROP INDEX IF EXISTS "DailyInsight_url_key";

-- Add composite unique constraint on url + clientId
CREATE UNIQUE INDEX "DailyInsight_url_clientId_key" ON "DailyInsight"("url", "clientId");
