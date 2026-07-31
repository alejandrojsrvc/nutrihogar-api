import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchMealInput,
  ServedPortionConsumptionUnitOfWork,
  ServedPortionRepository,
} from '../ports/served-portion-repository.port';
import {
  InvalidConsumptionDateError,
  InvalidRemainderInputError,
  ServedPortionConsumptionAccessDeniedError,
  ServedPortionNotFoundError,
} from '../errors/served-portion-consumption.errors';
import { PreparedBatchNotFoundError } from '../errors/prepared-batch-application.errors';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import {
  ConfirmServedPortionConsumptionCommand,
  ConfirmServedPortionConsumptionResult,
} from '../models/served-portion-consumption.models';

export const CONFIRM_SERVED_PORTION_CONSUMPTION_USE_CASE = Symbol(
  'ConfirmServedPortionConsumptionUseCase',
);

export class ConfirmServedPortionConsumptionUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly portions: ServedPortionRepository,
    private readonly transaction: ServedPortionConsumptionUnitOfWork,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: ConfirmServedPortionConsumptionCommand,
  ): Promise<ConfirmServedPortionConsumptionResult> {
    const portion = await this.portions.findById(command.portionId);
    if (!portion) throw new ServedPortionNotFoundError();

    const batch = await this.batches.findById(portion.preparedBatchId);
    if (!batch) throw new PreparedBatchNotFoundError();
    const access = await this.households.findAccess(command.actorId, batch.householdId);
    if (!access || access.status !== 'ACTIVE') {
      throw new ServedPortionConsumptionAccessDeniedError();
    }
    if (batch.status !== 'FINALIZED' || !batch.finalCookedWeight) {
      throw new PreparedBatchNotFinalizedError();
    }

    ensureConsumptionDate(command.consumedAt, this.clock.now());
    if ((command.remainderWeight === undefined) !== (command.remainderDisposition === undefined)) {
      throw new InvalidRemainderInputError();
    }

    if (command.remainderWeight !== undefined) {
      portion.recordRemainder(
        command.remainderWeight,
        command.remainderDisposition!,
        command.consumedAt,
      );
    }

    const consumedWeight = portion.consumedWeight ?? portion.servedWeight;
    const nutrients = calculateConsumedNutrients(batch, consumedWeight);
    const mealId = consumedWeight.gt(0) ? crypto.randomUUID() : null;
    portion.confirmConsumption(nutrients, command.consumedAt, mealId);

    const meal = mealId
      ? createMealInput(
          mealId,
          batch.householdId,
          portion.adultProfileId,
          batch.recipeNameSnapshot,
          consumedWeight,
          nutrients,
          command,
        )
      : null;
    await this.transaction.confirmConsumption(portion, meal);

    return {
      portionId: portion.id,
      adultProfileId: portion.adultProfileId,
      servedWeight: portion.servedWeight,
      consumedWeight,
      remainderWeight: portion.remainder?.weight ?? null,
      remainderDisposition: portion.remainder?.disposition ?? null,
      mealId,
      nutrients,
    };
  }
}

function ensureConsumptionDate(consumedAt: Date, now: Date): void {
  const timestamp = consumedAt.getTime();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 5 * 60 * 1000) {
    throw new InvalidConsumptionDateError();
  }
}

function calculateConsumedNutrients(
  batch: {
    totalNutrients: Array<{ code: string; name: string; unit: string; amount: Decimal }>;
    finalCookedWeight: Decimal | null;
  },
  consumedWeight: Decimal,
) {
  if (!batch.finalCookedWeight) throw new PreparedBatchNotFinalizedError();

  return batch.totalNutrients.map((nutrient) => ({
    code: nutrient.code,
    name: nutrient.name,
    unit: nutrient.unit,
    amount: nutrient.amount.div(batch.finalCookedWeight).mul(consumedWeight),
  }));
}

function createMealInput(
  id: string,
  householdId: string,
  adultProfileId: string,
  recipeNameSnapshot: string,
  consumedWeight: Decimal,
  nutrients: ConfirmServedPortionConsumptionResult['nutrients'],
  command: ConfirmServedPortionConsumptionCommand,
): PreparedBatchMealInput {
  return {
    id,
    householdId,
    adultProfileId,
    mealType: command.mealType,
    consumedAt: command.consumedAt,
    createdById: command.actorId,
    item: {
      nameSnapshot: recipeNameSnapshot,
      quantity: consumedWeight,
      nutrients,
    },
  };
}
