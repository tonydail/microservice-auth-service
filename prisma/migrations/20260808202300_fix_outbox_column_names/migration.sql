/*
  Warnings:

  - You are about to drop the column `aggregateId` on the `outbox_events` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `outbox_events` table. All the data in the column will be lost.
  - You are about to drop the column `eventType` on the `outbox_events` table. All the data in the column will be lost.
  - Added the required column `aggregate_id` to the `outbox_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `event_type` to the `outbox_events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "outbox_events" DROP COLUMN "aggregateId",
DROP COLUMN "createdAt",
DROP COLUMN "eventType",
ADD COLUMN     "aggregate_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "event_type" TEXT NOT NULL;
