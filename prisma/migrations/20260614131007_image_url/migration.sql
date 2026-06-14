/*
  Warnings:

  - You are about to drop the `product_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'UPLOADED';

-- DropForeignKey
ALTER TABLE "product_images" DROP CONSTRAINT "product_images_product_id_fkey";

-- DropIndex
DROP INDEX "orders_delivery_date_idx";

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "delivery_date" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "image_url" DROP DEFAULT;

-- DropTable
DROP TABLE "product_images";

-- CreateIndex
CREATE INDEX "orders_occasion_date_idx" ON "orders"("occasion_date");
