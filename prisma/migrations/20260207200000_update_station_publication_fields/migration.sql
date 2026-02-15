-- AlterTable: Add location to TVStation (remove channel)
ALTER TABLE "TVStation" DROP COLUMN IF EXISTS "channel";
ALTER TABLE "TVStation" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to RadioStation
ALTER TABLE "RadioStation" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to WebPublication
ALTER TABLE "WebPublication" ADD COLUMN IF NOT EXISTS "location" TEXT;

-- AlterTable: Add location to PrintPublication, rename circulation to reach (if circulation exists)
ALTER TABLE "PrintPublication" ADD COLUMN IF NOT EXISTS "location" TEXT;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'PrintPublication' AND column_name = 'circulation'
  ) THEN
    ALTER TABLE "PrintPublication" RENAME COLUMN "circulation" TO "reach";
  END IF;
END $$;
