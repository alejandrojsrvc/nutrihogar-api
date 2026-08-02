import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../../../recipes/application/ports/prepared-batch-repository.port';
import { PreparedFoodLeftoverRepository } from '../../../recipes/application/ports/prepared-food-leftover-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import { PreparationInventoryUnitOfWork } from '../ports/inventory-repository.port';
import {
  InventoryAccessDeniedError,
  InventoryAdminRequiredError,
  InvalidPreparationConsumptionError,
  InventoryItemNotFoundError,
} from '../errors/inventory-application.errors';

export const ADD_PREPARED_LEFTOVER_TO_INVENTORY_USE_CASE = Symbol(
  'AddPreparedLeftoverToInventoryUseCase',
);

export class AddPreparedLeftoverToInventoryUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly inventory: PreparationInventoryUnitOfWork,
  ) {}

  async execute(input: {
    actorId: string;
    leftoverId: string;
    quantity?: number;
    location?: string | null;
    expiresAt?: Date | null;
  }): Promise<InventoryItem> {
    const leftover = await this.leftovers.findById(input.leftoverId);
    if (!leftover) throw new InventoryItemNotFoundError('Prepared food leftover not found.');
    const access = await this.households.findAccess(input.actorId, leftover.householdId);
    if (!access || access.status !== 'ACTIVE') throw new InventoryAccessDeniedError();
    if (access.role !== 'ADMIN') throw new InventoryAdminRequiredError();
    if (leftover.status !== 'AVAILABLE' || !leftover.availableWeight.isPositive()) {
      throw new InvalidPreparationConsumptionError('The leftover is not available.');
    }
    const batch = await this.batches.findById(leftover.preparedBatchId);
    if (!batch || batch.householdId !== leftover.householdId)
      throw new InventoryItemNotFoundError('Prepared batch not found.');
    const quantity = input.quantity?.toString() ?? leftover.availableWeight.toString();
    return this.inventory.addPreparedLeftover({
      householdId: leftover.householdId,
      leftoverId: leftover.id,
      batchId: leftover.preparedBatchId,
      name: batch.recipeNameSnapshot,
      quantity,
      location: input.location === undefined ? leftover.storageLocation : input.location,
      minimumQuantity: null,
      expiresAt: input.expiresAt ?? null,
      actorId: input.actorId,
      occurredAt: new Date(),
    });
  }
}
