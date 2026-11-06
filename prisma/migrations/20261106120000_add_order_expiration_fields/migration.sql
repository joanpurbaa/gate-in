-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "expiredAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "expiredNotifiedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_status_holdExpiresAt_idx" ON "Order"("status", "holdExpiresAt");
