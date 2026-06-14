ALTER TABLE "orders"
ADD COLUMN "shipping_duration_days" INTEGER,
ADD COLUMN "shipping_date" TIMESTAMP(3),
ADD COLUMN "production_deadline" TIMESTAMP(3);

CREATE INDEX "orders_production_deadline_idx" ON "orders"("production_deadline");
