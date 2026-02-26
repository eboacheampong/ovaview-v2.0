-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('TWITTER', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'YOUTUBE', 'TIKTOK');

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "profileUrl" TEXT,
    "avatarUrl" TEXT,
    "followersCount" INTEGER DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPost" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "postId" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "authorHandle" TEXT,
    "authorName" TEXT,
    "authorAvatarUrl" TEXT,
    "postUrl" TEXT NOT NULL,
    "embedUrl" TEXT,
    "embedHtml" TEXT,
    "mediaUrls" TEXT[],
    "mediaType" TEXT,
    "likesCount" INTEGER DEFAULT 0,
    "commentsCount" INTEGER DEFAULT 0,
    "sharesCount" INTEGER DEFAULT 0,
    "viewsCount" INTEGER DEFAULT 0,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "keywords" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL,
    "accountId" TEXT,
    "industryId" TEXT,
    "createdById" TEXT,
    "sentimentPositive" DOUBLE PRECISION,
    "sentimentNeutral" DOUBLE PRECISION,
    "sentimentNegative" DOUBLE PRECISION,
    "overallSentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialPostSubIndustry" (
    "id" TEXT NOT NULL,
    "socialPostId" TEXT NOT NULL,
    "subIndustryId" TEXT NOT NULL,

    CONSTRAINT "SocialPostSubIndustry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'news',
    "industry" TEXT NOT NULL DEFAULT 'general',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "crawlFrequency" INTEGER NOT NULL DEFAULT 60,
    "lastCrawledAt" TIMESTAMP(3),
    "articlesFound" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlerConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawlerLog" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "sourceName" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "articlesFound" INTEGER NOT NULL DEFAULT 0,
    "articlesSaved" INTEGER NOT NULL DEFAULT 0,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CrawlerLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_platform_handle_key" ON "SocialAccount"("platform", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPost_platform_postId_key" ON "SocialPost"("platform", "postId");

-- CreateIndex
CREATE INDEX "SocialPost_platform_idx" ON "SocialPost"("platform");

-- CreateIndex
CREATE INDEX "SocialPost_postedAt_idx" ON "SocialPost"("postedAt" DESC);

-- CreateIndex
CREATE INDEX "SocialPost_accountId_idx" ON "SocialPost"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialPostSubIndustry_socialPostId_subIndustryId_key" ON "SocialPostSubIndustry"("socialPostId", "subIndustryId");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlerSource_url_key" ON "CrawlerSource"("url");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlerConfig_key_key" ON "CrawlerConfig"("key");

-- CreateIndex
CREATE INDEX "CrawlerLog_sourceId_idx" ON "CrawlerLog"("sourceId");

-- CreateIndex
CREATE INDEX "CrawlerLog_startedAt_idx" ON "CrawlerLog"("startedAt" DESC);

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SocialAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "Industry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostSubIndustry" ADD CONSTRAINT "SocialPostSubIndustry_socialPostId_fkey" FOREIGN KEY ("socialPostId") REFERENCES "SocialPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialPostSubIndustry" ADD CONSTRAINT "SocialPostSubIndustry_subIndustryId_fkey" FOREIGN KEY ("subIndustryId") REFERENCES "SubIndustry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawlerLog" ADD CONSTRAINT "CrawlerLog_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CrawlerSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
