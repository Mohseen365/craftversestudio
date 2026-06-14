/*
  Warnings:

  - Made the column `image_url` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "orders_production_deadline_idx";

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "image_url" SET NOT NULL;
