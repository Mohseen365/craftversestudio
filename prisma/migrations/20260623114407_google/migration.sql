/*
  Warnings:

  - You are about to drop the column `production_days` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `capacity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `capacity_reservations` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "capacity_reservations" DROP CONSTRAINT "capacity_reservations_capacity_id_fkey";

-- DropForeignKey
ALTER TABLE "capacity_reservations" DROP CONSTRAINT "capacity_reservations_order_id_fkey";

-- DropIndex
DROP INDEX "orders_occasion_date_idx";

-- DropIndex
DROP INDEX "orders_status_idx";

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "hoursRequired" DECIMAL(6,2) NOT NULL DEFAULT 0.5;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "completedHours" DECIMAL(6,2) DEFAULT 0,
ADD COLUMN     "remainingHours" DECIMAL(6,2),
ADD COLUMN     "requiredHours" DECIMAL(6,2);

-- AlterTable
ALTER TABLE "products" DROP COLUMN "production_days",
ADD COLUMN     "productionHours" DECIMAL(6,2) NOT NULL DEFAULT 0.5;

-- DropTable
DROP TABLE "capacity";

-- DropTable
DROP TABLE "capacity_reservations";

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "capacity" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "maximumHours" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
    "availableHours" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_reservations" (
    "id" TEXT NOT NULL,
    "capacityId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "plannedHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "completedHours" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastModifiedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capacity_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingJob" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lockedBy" TEXT,

    CONSTRAINT "SchedulingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SchedulingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "hoursPerDay" DECIMAL(5,2) NOT NULL DEFAULT 8.0,
    "maxDaysPerOrder" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_date_key" ON "capacity"("date");

-- CreateIndex
CREATE INDEX "capacity_date_availableHours_idx" ON "capacity"("date", "availableHours");

-- CreateIndex
CREATE INDEX "capacity_reservations_orderId_capacityId_idx" ON "capacity_reservations"("orderId", "capacityId");

-- CreateIndex
CREATE UNIQUE INDEX "capacity_reservations_capacityId_orderId_key" ON "capacity_reservations"("capacityId", "orderId");

-- CreateIndex
CREATE INDEX "SchedulingJob_status_priority_createdAt_idx" ON "SchedulingJob"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "SchedulingJob_lockedBy_status_idx" ON "SchedulingJob"("lockedBy", "status");

-- CreateIndex
CREATE INDEX "SchedulingSnapshot_date_version_idx" ON "SchedulingSnapshot"("date", "version");

-- CreateIndex
CREATE INDEX "orders_status_production_deadline_idx" ON "orders"("status", "production_deadline");

-- CreateIndex
CREATE INDEX "orders_status_occasion_date_idx" ON "orders"("status", "occasion_date");

-- CreateIndex
CREATE INDEX "orders_production_deadline_idx" ON "orders"("production_deadline");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_capacityId_fkey" FOREIGN KEY ("capacityId") REFERENCES "capacity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "capacity_reservations" ADD CONSTRAINT "capacity_reservations_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
