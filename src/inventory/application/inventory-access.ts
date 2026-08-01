import { HouseholdRepository } from '../../households/application/ports/household-repository.port';
import { InventoryItem } from '../domain/entities/inventory-item';
import {
  InventoryAccessDeniedError,
  InventoryAdminRequiredError,
  InventoryItemNotFoundError,
} from './errors/inventory-application.errors';
import { InventoryItemRepository } from './ports/inventory-repository.port';

export async function requireHouseholdAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
  admin = false,
): Promise<void> {
  const access = await households.findAccess(actorId, householdId);
  if (!access || access.status !== 'ACTIVE') throw new InventoryAccessDeniedError();
  if (admin && access.role !== 'ADMIN') throw new InventoryAdminRequiredError();
}

export async function requireInventoryItemAccess(
  households: HouseholdRepository,
  inventory: InventoryItemRepository,
  actorId: string,
  inventoryItemId: string,
  admin = false,
): Promise<InventoryItem> {
  const item = await inventory.findById(inventoryItemId);
  if (!item) throw new InventoryItemNotFoundError();
  await requireHouseholdAccess(households, actorId, item.householdId, admin);
  return item;
}
