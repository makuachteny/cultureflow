-- CreateEnum
CREATE TYPE "ContactTopic" AS ENUM ('SUPPORT', 'PARTNERSHIPS', 'PRESS', 'TRUST', 'PREMIUM', 'ADS', 'PROMOS', 'EXTENSIONS', 'API', 'OTHER');

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "topic" "ContactTopic" NOT NULL DEFAULT 'OTHER',
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactMessage_createdAt_idx" ON "ContactMessage"("createdAt");

-- CreateIndex
CREATE INDEX "ContactMessage_topic_idx" ON "ContactMessage"("topic");

-- CreateIndex
CREATE INDEX "ContactMessage_email_idx" ON "ContactMessage"("email");

