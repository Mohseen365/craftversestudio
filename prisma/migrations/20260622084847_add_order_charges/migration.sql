-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customizationCharge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deliveryCharge" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "urgentOrderCharge" INTEGER NOT NULL DEFAULT 0;
