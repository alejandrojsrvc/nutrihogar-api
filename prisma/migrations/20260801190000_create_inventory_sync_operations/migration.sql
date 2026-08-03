CREATE TYPE "InventorySyncOperationStatus" AS ENUM ('APPLIED', 'CONFLICT');

CREATE TABLE "inventory_sync_operations" (
  "id" UUID NOT NULL,
  "operation_id" VARCHAR(255) NOT NULL,
  "household_id" UUID NOT NULL,
  "inventory_item_id" UUID,
  "actor_id" UUID NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "status" "InventorySyncOperationStatus" NOT NULL,
  "reason" TEXT,
  "resulting_version" INTEGER,
  "snapshot" JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "inventory_sync_operations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_sync_operations_operation_id_key" UNIQUE ("operation_id"),
  CONSTRAINT "inventory_sync_operations_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_sync_operations_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "inventory_sync_operations_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "inventory_sync_operations_household_id_created_at_idx" ON "inventory_sync_operations"("household_id", "created_at");
CREATE INDEX "inventory_sync_operations_inventory_item_id_created_at_idx" ON "inventory_sync_operations"("inventory_item_id", "created_at");
