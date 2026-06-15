/*
  Warnings:

  - You are about to alter the column `maximum_capacity` on the `capacity` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - You are about to drop the column `quantity` on the `capacity_reservations` table. All the data in the column will be lost.
  - You are about to alter the column `production_days` on the `products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[capacity_id,order_id]` on the table `capacity_reservations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `planned_quantity` to the `capacity_reservations` table without a default value. This is not possible if the table is not empty.
  - Made the column `image_url` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "capacity_reservations_order_id_key";

-- DropIndex
DROP INDEX "orders_production_deadline_idx";

-- AlterTable
ALTER TABLE "capacity" ALTER COLUMN "maximum_capacity" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "capacity_reservations" DROP COLUMN "quantity",
ADD COLUMN     "completed_quantity" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "planned_quantity" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "production_days" SET DEFAULT 1,
ALTER COLUMN "production_days" SET DATA TYPE DECIMAL(10,2),
ALTER COLUMN "image_url" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "capacity_reservations_capacity_id_order_id_key" ON "capacity_reservations"("capacity_id", "order_id");
