-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('pending', 'accepted', 'archived');

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN "status" "SocialPostStatus" NOT NULL DEFAULT 'pending';
ALTER TABLE "SocialPost" ADD COLUMN "title" TEXT;
ALTER TABLE "SocialPost" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE INDEX "SocialPost_status_idx" ON "SocialPost"("status");
CREATE UNIQUE INDEX "SocialPost_slug_key" ON "SocialPost"("slug");

-- Set all existing posts to 'pending' (they came from scraping)
UPDATE "SocialPost" SET "status" = 'pending';
