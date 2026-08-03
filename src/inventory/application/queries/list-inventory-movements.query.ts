import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { requireInventoryItemAccess } from '../inventory-access';
import {
  InventoryItemRepository,
  InventoryMovementRepository,
  PaginatedInventoryMovements,
} from '../ports/inventory-repository.port';

export const LIST_INVENTORY_MOVEMENTS_QUERY = Symbol('ListInventoryMovementsQuery');

export class ListInventoryMovementsQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
    private readonly movements: InventoryMovementRepository,
  ) {}

  async execute(
    actorId: string,
    inventoryItemId: string,
    pagination: { page: number; limit: number },
  ): Promise<PaginatedInventoryMovements> {
    await requireInventoryItemAccess(this.households, this.inventory, actorId, inventoryItemId);
    return this.movements.listByItem(inventoryItemId, pagination);
  }
}
