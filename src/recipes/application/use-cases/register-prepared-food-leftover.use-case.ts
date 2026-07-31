import crypto from 'node:crypto';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import {
  InvalidStoredAtError,
  PreparedFoodLeftoverAccessDeniedError,
} from '../errors/prepared-food-leftover-application.errors';
import { PreparedBatchNotFoundError } from '../errors/prepared-batch-application.errors';
import {
  PreparedFoodLeftoverResult,
  RegisterPreparedFoodLeftoverCommand,
} from '../models/prepared-food-leftover-command.models';

export const REGISTER_PREPARED_FOOD_LEFTOVER_USE_CASE = Symbol(
  'RegisterPreparedFoodLeftoverUseCase',
);

export class RegisterPreparedFoodLeftoverUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: RegisterPreparedFoodLeftoverCommand): Promise<PreparedFoodLeftoverResult> {
    const batch = await this.batches.findById(command.batchId);
    if (!batch) throw new PreparedBatchNotFoundError();
    await ensureHouseholdAccess(this.households, command.actorId, batch.householdId);
    if (batch.status !== 'FINALIZED' || !batch.finalCookedWeight) {
      throw new PreparedBatchNotFinalizedError();
    }
    const finalCookedWeight = batch.finalCookedWeight;
    ensureStoredAt(command.storedAt, this.clock.now());

    const leftover = PreparedFoodLeftover.create({
      id: crypto.randomUUID(),
      preparedBatchId: batch.id,
      householdId: batch.householdId,
      availableWeight: command.availableWeight,
      nutrientDensitySnapshot: batch.totalNutrients.map((nutrient) => ({
        code: nutrient.code,
        name: nutrient.name,
        unit: nutrient.unit,
        amountPerGram: nutrient.amount.div(finalCookedWeight),
      })),
      storedAt: command.storedAt,
      storageLocation: command.storageLocation,
      notes: command.notes,
      createdAt: this.clock.now(),
      updatedAt: this.clock.now(),
    });
    await this.leftovers.save(leftover);
    return leftover;
  }
}

export async function ensureHouseholdAccess(
  households: HouseholdRepository,
  actorId: string,
  householdId: string,
): Promise<void> {
  const access = await households.findAccess(actorId, householdId);
  if (!access || access.status !== 'ACTIVE') {
    throw new PreparedFoodLeftoverAccessDeniedError();
  }
}

function ensureStoredAt(storedAt: Date, now: Date): void {
  const timestamp = storedAt.getTime();
  if (!Number.isFinite(timestamp) || timestamp > now.getTime() + 5 * 60 * 1000) {
    throw new InvalidStoredAtError();
  }
}
