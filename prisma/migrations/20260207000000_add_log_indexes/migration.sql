-- Add indexes for efficient log queries

-- ArticleViewLog indexes
CREATE INDEX "ArticleViewLog_clientId_idx" ON "ArticleViewLog"("clientId");
CREATE INDEX "ArticleViewLog_userId_idx" ON "ArticleViewLog"("userId");
CREATE INDEX "ArticleViewLog_viewedAt_idx" ON "ArticleViewLog"("viewedAt" DESC);
CREATE INDEX "ArticleViewLog_mediaType_idx" ON "ArticleViewLog"("mediaType");

-- MediaEntryLog indexes
CREATE INDEX "MediaEntryLog_userId_idx" ON "MediaEntryLog"("userId");
CREATE INDEX "MediaEntryLog_mediaType_idx" ON "MediaEntryLog"("mediaType");
CREATE INDEX "MediaEntryLog_publisher_idx" ON "MediaEntryLog"("publisher");
CREATE INDEX "MediaEntryLog_timestamp_idx" ON "MediaEntryLog"("timestamp" DESC);
CREATE INDEX "MediaEntryLog_action_idx" ON "MediaEntryLog"("action");

-- EmailLog indexes
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt" DESC);
CREATE INDEX "EmailLog_recipient_idx" ON "EmailLog"("recipient");

-- VisitLog indexes
CREATE INDEX "VisitLog_userId_idx" ON "VisitLog"("userId");
CREATE INDEX "VisitLog_visitedAt_idx" ON "VisitLog"("visitedAt" DESC);
CREATE INDEX "VisitLog_page_idx" ON "VisitLog"("page");
CREATE INDEX "VisitLog_ipAddress_idx" ON "VisitLog"("ipAddress");

-- TenderViewLog indexes
CREATE INDEX "TenderViewLog_userId_idx" ON "TenderViewLog"("userId");
CREATE INDEX "TenderViewLog_tenderId_idx" ON "TenderViewLog"("tenderId");
CREATE INDEX "TenderViewLog_viewedAt_idx" ON "TenderViewLog"("viewedAt" DESC);