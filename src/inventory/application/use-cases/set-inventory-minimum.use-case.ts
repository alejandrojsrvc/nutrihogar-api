import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { InvalidInventoryItemError } from '../../domain/errors/inventory.errors';
import { requireInventoryItemAccess } from '../inventory-access';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export const SET_INVENTORY_MINIMUM_USE_CASE = Symbol('SetInventoryMinimumUseCase');

export interface SetInventoryMinimumCommand {
  actorId: string;
  inventoryItemId: string;
  minimumQuantity?: number | string | null;
  location?: string | null;
  expiresAt?: Date | null;
  occurredAt: Date;
}

export class SetInventoryMinimumUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  async execute(command: SetInventoryMinimumCommand): Promise<InventoryItem> {
    if (
      command.minimumQuantity === undefined &&
      command.location === undefined &&
      command.expiresAt === undefined
    ) {
      throw new InvalidInventoryItemError('At least one inventory metadata field is required');
    }
    const item = await requireInventoryItemAccess(
      this.households,
      this.inventory,
      command.actorId,
      command.inventoryItemId,
      true,
    );
    item.updateMetadata(command, command.occurredAt);
    await this.inventory.save(item);
    return item;
  }
}
