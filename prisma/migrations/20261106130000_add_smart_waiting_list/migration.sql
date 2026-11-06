-- CreateEnum
CREATE TYPE "WaitingListStatus" AS ENUM ('WAITING', 'OFFERED', 'CONVERTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "WaitingListEntry" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "WaitingListStatus" NOT NULL DEFAULT 'WAITING',
    "token" TEXT NOT NULL,
    "offerExpiresAt" TIMESTAMP(3),
    "offerNotifiedAt" TIMESTAMP(3),
    "convertedOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaitingListEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaitingListEntry_token_key" ON "WaitingListEntry"("token");

-- CreateIndex
CREATE INDEX "WaitingListEntry_eventId_zoneId_status_createdAt_idx" ON "WaitingListEntry"("eventId", "zoneId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WaitingListEntry_token_idx" ON "WaitingListEntry"("token");

-- CreateIndex
CREATE INDEX "WaitingListEntry_status_offerExpiresAt_idx" ON "WaitingListEntry"("status", "offerExpiresAt");

-- AddForeignKey
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaitingListEntry" ADD CONSTRAINT "WaitingListEntry_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
