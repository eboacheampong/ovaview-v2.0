-- Add slug field to WebStory
ALTER TABLE "WebStory" ADD COLUMN "slug" TEXT;

-- Add slug field to TVStory
ALTER TABLE "TVStory" ADD COLUMN "slug" TEXT;

-- Add slug field to RadioStory
ALTER TABLE "RadioStory" ADD COLUMN "slug" TEXT;

-- Add slug field to PrintStory
ALTER TABLE "PrintStory" ADD COLUMN "slug" TEXT;

-- Generate slugs for existing records (using id as fallback)
UPDATE "WebStory" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id, 1, 8) WHERE "slug" IS NULL;
UPDATE "TVStory" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id, 1, 8) WHERE "slug" IS NULL;
UPDATE "RadioStory" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id, 1, 8) WHERE "slug" IS NULL;
UPDATE "PrintStory" SET "slug" = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^\w\s-]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(id, 1, 8) WHERE "slug" IS NULL;

-- Make slug NOT NULL after populating
ALTER TABLE "WebStory" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "TVStory" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "RadioStory" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "PrintStory" ALTER COLUMN "slug" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "WebStory_slug_key" ON "WebStory"("slug");
CREATE UNIQUE INDEX "TVStory_slug_key" ON "TVStory"("slug");
CREATE UNIQUE INDEX "RadioStory_slug_key" ON "RadioStory"("slug");
CREATE UNIQUE INDEX "PrintStory_slug_key" ON "PrintStory"("slug");
