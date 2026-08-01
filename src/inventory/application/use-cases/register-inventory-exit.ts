import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryUnit } from '../../domain/models/inventory.models';
import { requireInventoryItemAccess } from '../inventory-access';
import { toInventoryBaseQuantity } from '../inventory-quantity-converter';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export interface RegisterInventoryExitCommand {
  actorId: string;
  inventoryItemId: string;
  quantity: number | string;
  unit: InventoryUnit;
  reason?: string | null;
  occurredAt: Date;
}

export async function registerInventoryExit(
  households: HouseholdRepository,
  inventory: InventoryItemRepository,
  command: RegisterInventoryExitCommand,
  type: 'CONSUMPTION' | 'WASTE' | 'EXPIRATION',
): Promise<InventoryItem> {
  const item = await requireInventoryItemAccess(
    households,
    inventory,
    command.actorId,
    command.inventoryItemId,
  );
  const quantity = toInventoryBaseQuantity(command.quantity, command.unit, item.unit);
  const metadata = {
    occurredAt: command.occurredAt,
    sourceType: `MANUAL_${type}`,
    sourceId: item.id,
    reason: command.reason,
    actorId: command.actorId,
  };
  if (type === 'CONSUMPTION') item.consume(quantity, metadata);
  if (type === 'WASTE') item.registerWaste(quantity, metadata);
  if (type === 'EXPIRATION') item.registerExpiration(quantity, metadata);
  await inventory.save(item);
  return item;
}
