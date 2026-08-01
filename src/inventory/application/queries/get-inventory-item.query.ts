import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { requireInventoryItemAccess } from '../inventory-access';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export const GET_INVENTORY_ITEM_QUERY = Symbol('GetInventoryItemQuery');

export class GetInventoryItemQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  execute(actorId: string, inventoryItemId: string): Promise<InventoryItem> {
    return requireInventoryItemAccess(this.households, this.inventory, actorId, inventoryItemId);
  }
}
