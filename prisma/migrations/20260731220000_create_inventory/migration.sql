CREATE TYPE "InventoryUnit" AS ENUM ('GRAM', 'MILLILITER', 'UNIT');
CREATE TYPE "InventoryItemType" AS ENUM ('FOOD', 'PREPARED_FOOD', 'CUSTOM');
CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIVE', 'DEPLETED', 'ARCHIVED');
CREATE TYPE "InventoryMovementType" AS ENUM (
  'PURCHASE',
  'CONSUMPTION',
  'ADJUSTMENT_INCREASE',
  'ADJUSTMENT_DECREASE',
  'WASTE',
  'EXPIRATION',
  'PREPARATION_CONSUMPTION',
  'REMAINDER_RETURN',
  'MANUAL_ENTRY'
);

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL,
  "household_id" UUID NOT NULL,
  "food_id" UUID,
  "prepared_food_leftover_id" UUID,
  "name_snapshot" VARCHAR(150) NOT NULL,
  "item_type" "InventoryItemType" NOT NULL,
  "current_quantity" DECIMAL(30,12) NOT NULL,
  "unit" "InventoryUnit" NOT NULL,
  "minimum_quantity" DECIMAL(30,12),
  "location" VARCHAR(100),
  "expires_at" TIMESTAMPTZ(6),
  "status" "InventoryItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "version" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_items_nonnegative_quantity" CHECK ("current_quantity" >= 0),
  CONSTRAINT "inventory_items_nonnegative_minimum" CHECK ("minimum_quantity" IS NULL OR "minimum_quantity" >= 0),
  CONSTRAINT "inventory_items_source_check" CHECK (
    ("item_type" = 'FOOD' AND "food_id" IS NOT NULL AND "prepared_food_leftover_id" IS NULL) OR
    ("item_type" = 'PREPARED_FOOD' AND "food_id" IS NULL AND "prepared_food_leftover_id" IS NOT NULL) OR
    ("item_type" = 'CUSTOM' AND "food_id" IS NULL AND "prepared_food_leftover_id" IS NULL)
  )
);

CREATE TABLE "inventory_movements" (
  "id" UUID NOT NULL,
  "item_id" UUID NOT NULL,
  "type" "InventoryMovementType" NOT NULL,
  "quantity" DECIMAL(30,12) NOT NULL,
  "unit" "InventoryUnit" NOT NULL,
  "occurred_at" TIMESTAMPTZ(6) NOT NULL,
  "source_type" VARCHAR(50),
  "source_id" VARCHAR(255),
  "reason" TEXT,
  "actor_id" UUID,
  "device_id" VARCHAR(255),
  "sync_operation_id" VARCHAR(255),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_items_household_id_status_idx" ON "inventory_items"("household_id", "status");
CREATE INDEX "inventory_items_household_id_item_type_idx" ON "inventory_items"("household_id", "item_type");
CREATE INDEX "inventory_items_household_id_expires_at_idx" ON "inventory_items"("household_id", "expires_at");
CREATE INDEX "inventory_items_food_id_idx" ON "inventory_items"("food_id");
CREATE INDEX "inventory_items_prepared_food_leftover_id_idx" ON "inventory_items"("prepared_food_leftover_id");
CREATE UNIQUE INDEX "inventory_movements_sync_operation_id_key" ON "inventory_movements"("sync_operation_id");
CREATE INDEX "inventory_movements_item_id_occurred_at_idx" ON "inventory_movements"("item_id", "occurred_at");
CREATE INDEX "inventory_movements_item_id_type_occurred_at_idx" ON "inventory_movements"("item_id", "type", "occurred_at");
CREATE INDEX "inventory_movements_actor_id_idx" ON "inventory_movements"("actor_id");

ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_food_id_fkey"
  FOREIGN KEY ("food_id") REFERENCES "foods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_prepared_food_leftover_id_fkey"
  FOREIGN KEY ("prepared_food_leftover_id") REFERENCES "prepared_food_leftovers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_fkey"
  FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
