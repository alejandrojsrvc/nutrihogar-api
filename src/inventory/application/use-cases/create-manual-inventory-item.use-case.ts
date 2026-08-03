import crypto from 'node:crypto';
import { FoodCatalogReadRepository } from '../../../food-catalog/application/ports/food-catalog-read-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { InventoryItem } from '../../domain/entities/inventory-item';
import {
  DuplicateInventorySourceError,
  InventoryFoodNotAvailableError,
} from '../errors/inventory-application.errors';
import { InventoryUnit } from '../../domain/models/inventory.models';
import { requireHouseholdAccess } from '../inventory-access';
import { toInventoryBaseQuantity } from '../inventory-quantity-converter';
import { InventoryItemRepository } from '../ports/inventory-repository.port';

export const CREATE_MANUAL_INVENTORY_ITEM_USE_CASE = Symbol('CreateManualInventoryItemUseCase');

export interface CreateManualInventoryItemCommand {
  actorId: string;
  householdId: string;
  foodId: string;
  quantity: number | string;
  unit: InventoryUnit;
  minimumQuantity?: number | string | null;
  location?: string | null;
  expiresAt?: Date | null;
  occurredAt: Date;
  reason?: string | null;
}

export class CreateManualInventoryItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly foods: FoodCatalogReadRepository,
    private readonly inventory: InventoryItemRepository,
  ) {}

  async execute(command: CreateManualInventoryItemCommand): Promise<InventoryItem> {
    await requireHouseholdAccess(this.households, command.actorId, command.householdId, true);
    const food = await this.foods.findVisibleById(command.actorId, command.foodId);
    if (
      !food ||
      food.foodType === 'PREPARED' ||
      (!food.isGlobal && food.householdId !== command.householdId)
    ) {
      throw new InventoryFoodNotAvailableError();
    }
    if (
      await this.inventory.findBySource(
        command.householdId,
        { foodId: food.id },
        {
          unit: food.referenceUnit,
          location: command.location?.trim() || null,
          expiresAt: command.expiresAt ?? null,
        },
      )
    ) {
      throw new DuplicateInventorySourceError();
    }

    const quantity = toInventoryBaseQuantity(command.quantity, command.unit, food.referenceUnit);
    const item = InventoryItem.create({
      id: crypto.randomUUID(),
      householdId: command.householdId,
      foodId: food.id,
      preparedFoodLeftoverId: null,
      nameSnapshot: food.name,
      itemType: 'FOOD',
      initialQuantity: quantity,
      unit: food.referenceUnit,
      minimumQuantity: command.minimumQuantity,
      location: command.location,
      expiresAt: command.expiresAt,
      createdAt: command.occurredAt,
      initialMovement: {
        occurredAt: command.occurredAt,
        sourceType: 'MANUAL_ENTRY',
        sourceId: food.id,
        reason: command.reason,
        actorId: command.actorId,
      },
    });
    await this.inventory.save(item);
    return item;
  }
}
