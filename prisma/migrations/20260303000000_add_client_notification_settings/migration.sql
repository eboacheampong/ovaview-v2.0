-- CreateTable
CREATE TABLE "ClientNotificationSetting" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "notificationTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Harare',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientNotificationSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientNotificationSetting_clientId_key" ON "ClientNotificationSetting"("clientId");

-- CreateIndex
CREATE INDEX "ClientNotificationSetting_notificationTime_idx" ON "ClientNotificationSetting"("notificationTime");

-- CreateIndex
CREATE INDEX "ClientNotificationSetting_isActive_idx" ON "ClientNotificationSetting"("isActive");

-- AddForeignKey
ALTER TABLE "ClientNotificationSetting" ADD CONSTRAINT "ClientNotificationSetting_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
