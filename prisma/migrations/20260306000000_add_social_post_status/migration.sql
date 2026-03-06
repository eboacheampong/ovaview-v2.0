-- CreateEnum
CREATE TYPE "SocialPostStatus" AS ENUM ('pending', 'accepted', 'archived');

-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN "status" "SocialPostStatus" NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX "SocialPost_status_idx" ON "SocialPost"("status");

-- Set all existing posts to 'pending' (they came from scraping)
UPDATE "SocialPost" SET "status" = 'pending';
