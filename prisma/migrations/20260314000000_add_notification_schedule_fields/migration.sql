-- AlterTable
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "weeklyDay" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "weeklyTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "monthlyDay" INTEGER NOT NULL DEFAULT 31;
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "monthlyTime" TEXT NOT NULL DEFAULT '18:00';
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "weeklyEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ClientNotificationSetting" ADD COLUMN "monthlyEnabled" BOOLEAN NOT NULL DEFAULT true;
