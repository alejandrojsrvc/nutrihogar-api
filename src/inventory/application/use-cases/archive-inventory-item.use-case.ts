import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { requireInventoryItemAccess } from '../inventory-access';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export const ARCHIVE_INVENTORY_ITEM_USE_CASE = Symbol('ArchiveInventoryItemUseCase');

export class ArchiveInventoryItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  async execute(actorId: string, inventoryItemId: string, occurredAt = new Date()): Promise<void> {
    const item = await requireInventoryItemAccess(
      this.households,
      this.inventory,
      actorId,
      inventoryItemId,
      true,
    );
    item.archive(occurredAt);
    await this.inventory.save(item);
  }
}
