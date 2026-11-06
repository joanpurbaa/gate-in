-- CreateEnum
CREATE TYPE "EventCategory" AS ENUM ('MUSIC', 'TECH', 'ARTS', 'EDUCATION', 'COMMUNITY', 'SPORTS');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "category" "EventCategory" NOT NULL DEFAULT 'COMMUNITY',
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "organizerName" TEXT;

-- CreateIndex
CREATE INDEX "Event_category_idx" ON "Event"("category");

-- CreateIndex
CREATE INDEX "Event_isFeatured_idx" ON "Event"("isFeatured");
