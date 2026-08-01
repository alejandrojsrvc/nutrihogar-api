import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItemType, InventoryItemStatus } from '../../domain/models/inventory.models';
import { requireHouseholdAccess } from '../inventory-access';
import {
  InventoryItemRepository,
  PaginatedInventoryItems,
} from '../ports/inventory-repository.port';

export const LIST_INVENTORY_ITEMS_QUERY = Symbol('ListInventoryItemsQuery');

export interface ListInventoryItemsInput {
  query?: string;
  itemType?: InventoryItemType;
  status?: InventoryItemStatus;
  location?: string;
  belowMinimum?: boolean;
  expiresBefore?: Date;
  page: number;
  limit: number;
}

export class ListInventoryItemsQuery {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  async execute(
    actorId: string,
    householdId: string,
    filters: ListInventoryItemsInput,
  ): Promise<PaginatedInventoryItems> {
    await requireHouseholdAccess(this.households, actorId, householdId);
    return this.inventory.listByHousehold(householdId, filters);
  }
}
