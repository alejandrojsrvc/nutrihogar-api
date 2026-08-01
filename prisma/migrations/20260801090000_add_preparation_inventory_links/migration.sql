ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_prepared_food_leftover_id_key" UNIQUE ("prepared_food_leftover_id");

CREATE TABLE "preparation_inventory_consumptions" (
  "id" UUID NOT NULL,
  "prepared_batch_id" UUID NOT NULL,
  "household_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "preparation_inventory_consumptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "preparation_inventory_consumptions_prepared_batch_id_key"
  ON "preparation_inventory_consumptions"("prepared_batch_id");
CREATE INDEX "preparation_inventory_consumptions_household_id_idx"
  ON "preparation_inventory_consumptions"("household_id");
ALTER TABLE "preparation_inventory_consumptions"
  ADD CONSTRAINT "preparation_inventory_consumptions_prepared_batch_id_fkey"
  FOREIGN KEY ("prepared_batch_id") REFERENCES "prepared_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preparation_inventory_consumptions"
  ADD CONSTRAINT "preparation_inventory_consumptions_household_id_fkey"
  FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "preparation_inventory_consumptions"
  ADD CONSTRAINT "preparation_inventory_consumptions_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
