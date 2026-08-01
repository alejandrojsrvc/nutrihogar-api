-- AlterTable
ALTER TABLE "purchase_items" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "purchases" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shopping_list_items" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shopping_lists" ALTER COLUMN "updated_at" DROP DEFAULT;

-- RenameForeignKey
ALTER TABLE "shopping_list_items" RENAME CONSTRAINT "shopping_list_items_actor_fkey" TO "shopping_list_items_actor_id_fkey";

-- RenameForeignKey
ALTER TABLE "shopping_list_items" RENAME CONSTRAINT "shopping_list_items_food_fkey" TO "shopping_list_items_food_id_fkey";

-- RenameForeignKey
ALTER TABLE "shopping_list_items" RENAME CONSTRAINT "shopping_list_items_list_fkey" TO "shopping_list_items_shopping_list_id_fkey";

-- RenameForeignKey
ALTER TABLE "shopping_list_items" RENAME CONSTRAINT "shopping_list_items_purchased_by_fkey" TO "shopping_list_items_purchased_by_id_fkey";

-- RenameForeignKey
ALTER TABLE "shopping_list_items" RENAME CONSTRAINT "shopping_list_items_removed_by_fkey" TO "shopping_list_items_removed_by_id_fkey";

-- RenameIndex
ALTER INDEX "shopping_list_items_list_food_status_idx" RENAME TO "shopping_list_items_shopping_list_id_food_id_status_idx";

-- RenameIndex
ALTER INDEX "shopping_list_items_list_status_idx" RENAME TO "shopping_list_items_shopping_list_id_status_idx";

-- RenameIndex
ALTER INDEX "shopping_list_items_manual_compatibility_idx" RENAME TO "shopping_list_items_shopping_list_id_normalized_name_unit_s_idx";

-- RenameIndex
ALTER INDEX "shopping_list_items_source_idx" RENAME TO "shopping_list_items_source_source_reference_id_idx";
