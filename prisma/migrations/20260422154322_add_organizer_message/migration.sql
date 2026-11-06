-- CreateTable
CREATE TABLE "OrganizerMessage" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "senderUserId" TEXT,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizerMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizerMessage_organizerId_createdAt_idx" ON "OrganizerMessage"("organizerId", "createdAt");

-- CreateIndex
CREATE INDEX "OrganizerMessage_senderEmail_idx" ON "OrganizerMessage"("senderEmail");

-- AddForeignKey
ALTER TABLE "OrganizerMessage" ADD CONSTRAINT "OrganizerMessage_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

