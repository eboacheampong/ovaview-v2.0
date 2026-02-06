-- AlterTable
ALTER TABLE "PrintStory" ADD COLUMN     "overallSentiment" TEXT,
ADD COLUMN     "sentimentNegative" DOUBLE PRECISION,
ADD COLUMN     "sentimentNeutral" DOUBLE PRECISION,
ADD COLUMN     "sentimentPositive" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RadioStory" ADD COLUMN     "overallSentiment" TEXT,
ADD COLUMN     "sentimentNegative" DOUBLE PRECISION,
ADD COLUMN     "sentimentNeutral" DOUBLE PRECISION,
ADD COLUMN     "sentimentPositive" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "TVStory" ADD COLUMN     "overallSentiment" TEXT,
ADD COLUMN     "sentimentNegative" DOUBLE PRECISION,
ADD COLUMN     "sentimentNeutral" DOUBLE PRECISION,
ADD COLUMN     "sentimentPositive" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "WebStory" ADD COLUMN     "overallSentiment" TEXT,
ADD COLUMN     "sentimentNegative" DOUBLE PRECISION,
ADD COLUMN     "sentimentNeutral" DOUBLE PRECISION,
ADD COLUMN     "sentimentPositive" DOUBLE PRECISION;
