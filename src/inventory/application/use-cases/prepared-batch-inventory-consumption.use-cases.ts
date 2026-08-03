import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../../../recipes/application/ports/prepared-batch-repository.port';
import {
  PreparationInventoryUnitOfWork,
  PreparedBatchInventoryDecision,
} from '../ports/inventory-repository.port';
import {
  InventoryAccessDeniedError,
  InventoryAdminRequiredError,
  InventoryItemNotFoundError,
  InvalidPreparationConsumptionError,
  PreparedBatchInventoryAlreadyAppliedError,
  PreparedBatchNotFinalizedForInventoryError,
} from '../errors/inventory-application.errors';

export const PREVIEW_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE = Symbol(
  'PreviewPreparedBatchInventoryConsumptionUseCase',
);
export const CONFIRM_PREPARED_BATCH_INVENTORY_CONSUMPTION_USE_CASE = Symbol(
  'ConfirmPreparedBatchInventoryConsumptionUseCase',
);

export interface PreparedBatchInventoryPreview {
  batchId: string;
  ingredients: Array<{
    ingredientId: string;
    foodId: string;
    quantity: string;
    unit: string;
    availableQuantity: string;
    availability: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
    candidates: PreviewCandidate[];
  }>;
}

type PreviewCandidate = {
  id: string;
  foodId: string | null;
  quantity: string;
  unit: string;
  status: string;
  location: string | null;
  expiresAt: Date | null;
};

export class PreviewPreparedBatchInventoryConsumptionUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly inventory: PreparationInventoryUnitOfWork,
  ) {}

  async execute(actorId: string, batchId: string): Promise<PreparedBatchInventoryPreview> {
    const batch = await this.batches.findById(batchId);
    if (!batch) throw new InventoryItemNotFoundError('Prepared batch not found.');
    await requireMember(this.households, actorId, batch.householdId);
    ensureFinalized(batch.status);
    const ingredients = await Promise.all(
      batch.ingredients.map(async (ingredient) => ({
        ingredientId: ingredient.id,
        foodId: ingredient.foodId,
        quantity: ingredient.baseQuantity?.toString() ?? ingredient.quantity.toString(),
        unit: ingredient.baseUnit ?? ingredient.unit,
        candidates: (
          await this.inventory.findCandidates(
            batch.householdId,
            ingredient.foodId,
            toInventoryUnit(ingredient.baseUnit ?? ingredient.unit),
          )
        ).map(toCandidate),
      })),
    );
    return {
      batchId,
      ingredients: ingredients.map((ingredient) => {
        const availableQuantity = ingredient.candidates
          .filter((candidate) => candidate.status === 'ACTIVE')
          .reduce((total, candidate) => total.plus(candidate.quantity), new Decimal(0));
        const requiredQuantity = new Decimal(ingredient.quantity);
        return {
          ...ingredient,
          availableQuantity: availableQuantity.toString(),
          availability: availableQuantity.gte(requiredQuantity)
            ? 'AVAILABLE'
            : availableQuantity.gt(0)
              ? 'PARTIAL'
              : 'UNAVAILABLE',
        };
      }),
    };
  }
}

export class ConfirmPreparedBatchInventoryConsumptionUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly inventory: PreparationInventoryUnitOfWork,
  ) {}

  async execute(input: {
    actorId: string;
    batchId: string;
    decisions: Array<{
      ingredientId: string;
      action: 'CONSUME' | 'IGNORE';
      inventoryItemId?: string;
    }>;
  }): Promise<void> {
    const batch = await this.batches.findById(input.batchId);
    if (!batch) throw new InventoryItemNotFoundError('Prepared batch not found.');
    const access = await requireMember(this.households, input.actorId, batch.householdId);
    if (access.role !== 'ADMIN') throw new InventoryAdminRequiredError();
    ensureFinalized(batch.status);
    if (await this.inventory.hasPreparedBatchConsumption(input.batchId)) {
      throw new PreparedBatchInventoryAlreadyAppliedError();
    }
    const byId = new Map(batch.ingredients.map((ingredient) => [ingredient.id, ingredient]));
    if (
      input.decisions.length !== byId.size ||
      new Set(input.decisions.map((d) => d.ingredientId)).size !== input.decisions.length
    ) {
      throw new InvalidPreparationConsumptionError('Each ingredient must be decided exactly once.');
    }
    const decisions: PreparedBatchInventoryDecision[] = input.decisions.map((decision) => {
      const ingredient = byId.get(decision.ingredientId);
      if (!ingredient || !['CONSUME', 'IGNORE'].includes(decision.action)) {
        throw new InvalidPreparationConsumptionError();
      }
      if (decision.action === 'CONSUME' && !decision.inventoryItemId) {
        throw new InvalidPreparationConsumptionError(
          'A consumed ingredient requires an inventory item.',
        );
      }
      return {
        ingredientId: ingredient.id,
        action: decision.action,
        inventoryItemId: decision.inventoryItemId,
        quantity: ingredient.baseQuantity?.toString() ?? ingredient.quantity.toString(),
        unit: toInventoryUnit(ingredient.baseUnit ?? ingredient.unit),
      };
    });
    await this.inventory.confirmPreparedBatchConsumption({
      householdId: batch.householdId,
      batchId: input.batchId,
      actorId: input.actorId,
      decisions,
      occurredAt: new Date(),
    });
  }
}

function ensureFinalized(status: string): void {
  if (status !== 'FINALIZED') throw new PreparedBatchNotFinalizedForInventoryError();
}

async function requireMember(households: HouseholdRepository, userId: string, householdId: string) {
  const access = await households.findAccess(userId, householdId);
  if (!access || access.status !== 'ACTIVE') throw new InventoryAccessDeniedError();
  return access;
}

function toInventoryUnit(unit: string): 'GRAM' | 'MILLILITER' | 'UNIT' {
  if (unit === 'GRAM' || unit === 'MILLILITER' || unit === 'UNIT') return unit;
  throw new InvalidPreparationConsumptionError('Ingredient has no compatible inventory unit.');
}

function toCandidate(item: {
  id: string;
  foodId: string | null;
  currentQuantity: Decimal;
  unit: string;
  status: string;
  location: string | null;
  expiresAt: Date | null;
}): PreviewCandidate {
  return {
    id: item.id,
    foodId: item.foodId,
    quantity: item.currentQuantity.toString(),
    unit: item.unit,
    status: item.status,
    location: item.location,
    expiresAt: item.expiresAt,
  };
}
