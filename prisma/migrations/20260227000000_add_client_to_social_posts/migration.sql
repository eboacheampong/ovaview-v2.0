-- AlterTable
ALTER TABLE "SocialPost" ADD COLUMN "clientId" TEXT;

-- DropIndex (old unique constraint)
DROP INDEX IF EXISTS "SocialPost_platform_postId_key";

-- CreateIndex (new unique constraint including clientId)
CREATE UNIQUE INDEX "SocialPost_platform_postId_clientId_key" ON "SocialPost"("platform", "postId", "clientId");

-- CreateIndex
CREATE INDEX "SocialPost_clientId_idx" ON "SocialPost"("clientId");

-- AddForeignKey
ALTER TABLE "SocialPost" ADD CONSTRAINT "SocialPost_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
