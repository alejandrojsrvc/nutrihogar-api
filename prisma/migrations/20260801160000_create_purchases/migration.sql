CREATE TYPE "PurchaseStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

CREATE TABLE "purchases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "household_id" UUID NOT NULL,
    "registered_by_id" UUID NOT NULL,
    "store_name" VARCHAR(150) NOT NULL,
    "purchase_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "PurchaseStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(3) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "purchases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purchase_id" UUID NOT NULL,
    "food_id" UUID,
    "inventory_item_id" UUID,
    "source_shopping_item_id" UUID,
    "name_snapshot" VARCHAR(150) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(30,12) NOT NULL,
    CONSTRAINT "purchase_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "purchases_household_id_purchase_date_idx" ON "purchases"("household_id", "purchase_date");
CREATE INDEX "purchases_household_id_status_purchase_date_idx" ON "purchases"("household_id", "status", "purchase_date");
CREATE INDEX "purchases_registered_by_id_idx" ON "purchases"("registered_by_id");
CREATE INDEX "purchase_items_purchase_id_idx" ON "purchase_items"("purchase_id");
CREATE INDEX "purchase_items_food_id_idx" ON "purchase_items"("food_id");
CREATE INDEX "purchase_items_inventory_item_id_idx" ON "purchase_items"("inventory_item_id");
CREATE INDEX "purchase_items_source_shopping_item_id_idx" ON "purchase_items"("source_shopping_item_id");

ALTER TABLE "purchases" ADD CONSTRAINT "purchases_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_registered_by_id_fkey" FOREIGN KEY ("registered_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_purchase_id_fkey" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_food_id_fkey" FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_items" ADD CONSTRAINT "purchase_items_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
