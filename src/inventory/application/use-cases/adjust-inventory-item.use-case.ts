import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InventoryUnit } from '../../domain/models/inventory.models';
import { requireInventoryItemAccess } from '../inventory-access';
import { toInventoryBaseQuantity } from '../inventory-quantity-converter';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export const ADJUST_INVENTORY_ITEM_USE_CASE = Symbol('AdjustInventoryItemUseCase');

export interface AdjustInventoryItemCommand {
  actorId: string;
  inventoryItemId: string;
  quantity: number | string;
  unit: InventoryUnit;
  reason: string;
  occurredAt: Date;
}

export class AdjustInventoryItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  async execute(command: AdjustInventoryItemCommand): Promise<InventoryItem> {
    const item = await requireInventoryItemAccess(
      this.households,
      this.inventory,
      command.actorId,
      command.inventoryItemId,
      true,
    );
    item.adjustTo(toInventoryBaseQuantity(command.quantity, command.unit, item.unit), {
      occurredAt: command.occurredAt,
      sourceType: 'MANUAL_ADJUSTMENT',
      sourceId: item.id,
      reason: command.reason,
      actorId: command.actorId,
    });
    await this.inventory.save(item);
    return item;
  }
}
