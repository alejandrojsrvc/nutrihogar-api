import Decimal from 'decimal.js';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { MealType } from '../../../meal-tracking/domain/models/meal.models';
import { PreparedFoodLeftoverRepository } from '../../../recipes/application/ports/prepared-food-leftover-repository.port';
import {
  InsufficientInventoryError,
  InvalidInventoryQuantityError,
} from '../../domain/errors/inventory.errors';
import {
  PreparedFoodLeftoverNotFoundError,
  PreparedInventoryItemTypeError,
  PreparedInventoryProfileAccessError,
} from '../errors/inventory-application.errors';
import { requireInventoryItemAccess } from '../inventory-access';
import {
  InventoryItemRepository,
  PreparedInventoryConsumptionUnitOfWork,
} from '../ports/inventory-repository.port';
import { MealView } from '../../../meal-tracking/domain/models/meal.models';

export const CONSUME_PREPARED_INVENTORY_ITEM_USE_CASE = Symbol(
  'ConsumePreparedInventoryItemUseCase',
);

export interface ConsumePreparedInventoryItemCommand {
  actorId: string;
  inventoryItemId: string;
  adultProfileId: string;
  mealType: MealType;
  quantity: Decimal.Value;
  consumedAt: Date;
}

export class ConsumePreparedInventoryItemUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly inventory: InventoryItemRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
    private readonly adultProfiles: AdultProfileRepository,
    private readonly transaction: PreparedInventoryConsumptionUnitOfWork,
  ) {}

  async execute(command: ConsumePreparedInventoryItemCommand): Promise<MealView> {
    const item = await requireInventoryItemAccess(
      this.households,
      this.inventory,
      command.actorId,
      command.inventoryItemId,
    );
    if (item.itemType !== 'PREPARED_FOOD' || item.unit !== 'GRAM' || !item.preparedFoodLeftoverId) {
      throw new PreparedInventoryItemTypeError();
    }

    let quantity: Decimal;
    try {
      quantity = new Decimal(command.quantity);
    } catch {
      throw new InvalidInventoryQuantityError();
    }
    if (!quantity.isFinite() || quantity.lte(0)) throw new InvalidInventoryQuantityError();
    if (quantity.gt(item.currentQuantity)) throw new InsufficientInventoryError();

    const profile = await this.adultProfiles.findActiveById(command.adultProfileId);
    if (!profile || !profile.isActive || profile.householdId !== item.householdId) {
      throw new PreparedInventoryProfileAccessError();
    }
    const leftover = await this.leftovers.findById(item.preparedFoodLeftoverId);
    if (!leftover || leftover.householdId !== item.householdId)
      throw new PreparedFoodLeftoverNotFoundError();
    if (quantity.gt(leftover.availableWeight)) throw new InsufficientInventoryError();

    item.consume(quantity, {
      occurredAt: command.consumedAt,
      actorId: command.actorId,
      sourceType: 'PREPARED_INVENTORY',
      sourceId: leftover.preparedBatchId,
      reason: 'Prepared food consumed as meal',
    });

    const meal = await this.transaction.consume({
      item,
      meal: {
        householdId: item.householdId,
        adultProfileId: command.adultProfileId,
        mealType: command.mealType,
        consumedAt: command.consumedAt,
        notes: `Prepared batch ${leftover.preparedBatchId}`,
        createdById: command.actorId,
        source: 'PREPARED_INVENTORY',
        items: [
          {
            foodId: null,
            foodServingId: null,
            nameSnapshot: item.nameSnapshot,
            brandSnapshot: null,
            preparationStateSnapshot: 'READY_TO_EAT',
            quantity,
            unit: 'GRAM',
            baseQuantity: quantity,
            baseUnit: 'GRAM',
            measurementMethod: 'WEIGHED',
            confidenceLevel: 'VERIFIED',
            nutrients: leftover.nutrientDensitySnapshot.map((nutrient) => ({
              code: nutrient.code,
              name: nutrient.name,
              unit: nutrient.unit,
              amount: nutrient.amountPerGram.mul(quantity),
            })),
          },
        ],
      },
    });
    return meal.meal;
  }
}
