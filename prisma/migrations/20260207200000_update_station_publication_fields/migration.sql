-- AlterTable: Add location to TVStation (remove channel)
ALTER TABLE "TVStation" DROP COLUMN IF EXISTS "channel";
ALTER TABLE "TVStation" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to RadioStation
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to WebPublication
ALTER TABLE "WebPublication" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to PrintPublication, rename circulation to reach
ALTER TABLE "PrintPublication" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "PrintPublication" RENAME COLUMN "circulation" TO "reach";
