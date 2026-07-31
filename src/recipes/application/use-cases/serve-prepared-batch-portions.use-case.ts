import crypto from 'node:crypto';
import Decimal from 'decimal.js';
import { AdultProfileNotFoundError } from '../../../households/application/adult-profile-errors/adult-profile.errors';
import { AdultProfileRepository } from '../../../households/application/adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchAvailabilityRepository,
  ServedPortionUnitOfWork,
} from '../ports/served-portion-repository.port';
import { ServedPortion } from '../../domain/entities/served-portion';
import {
  InvalidServedAtError,
  PortionAvailabilityExceededError,
  ServedPortionsRequiredError,
} from '../../domain/errors/served-portion.errors';
import { PreparedBatchNotFinalizedError } from '../../domain/errors/prepared-batch.errors';
import {
  PreparedBatchAccessDeniedError,
  PreparedBatchNotFoundError,
} from '../errors/prepared-batch-application.errors';
import {
  ServePreparedBatchPortionsCommand,
  ServePreparedBatchPortionsResult,
} from '../models/served-portion-command.models';

export const SERVE_PREPARED_BATCH_PORTIONS_USE_CASE = Symbol('ServePreparedBatchPortionsUseCase');

export class ServePreparedBatchPortionsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly availability: PreparedBatchAvailabilityRepository,
    private readonly portions: ServedPortionUnitOfWork,
    private readonly adultProfiles: AdultProfileRepository,
    private readonly clock: Clock,
  ) {}

  async execute(
    command: ServePreparedBatchPortionsCommand,
  ): Promise<ServePreparedBatchPortionsResult> {
    if (command.portions.length === 0) throw new ServedPortionsRequiredError();

    const batch = await this.batches.findById(command.batchId);
    if (!batch) throw new PreparedBatchNotFoundError();
    const access = await this.households.findAccess(command.actorId, batch.householdId);
    if (!access || access.status !== 'ACTIVE') throw new PreparedBatchAccessDeniedError();
    if (batch.status !== 'FINALIZED') throw new PreparedBatchNotFinalizedError();

    const servedAt = command.servedAt ?? this.clock.now();
    if (
      !Number.isFinite(servedAt.getTime()) ||
      servedAt.getTime() > this.clock.now().getTime() + 5 * 60 * 1000
    ) {
      throw new InvalidServedAtError();
    }

    const profiles = await this.adultProfiles.listActiveByHousehold(batch.householdId);
    const profileIds = new Set(profiles.map((profile) => profile.id));
    if (command.portions.some((portion) => !profileIds.has(portion.adultProfileId))) {
      throw new AdultProfileNotFoundError();
    }

    const currentAvailability = await this.availability.getAvailability(batch.id);
    if (!currentAvailability) throw new PreparedBatchNotFinalizedError();
    const requestedWeight = command.portions.reduce(
      (total, portion) => total.add(portion.servedWeight),
      new Decimal(0),
    );
    if (requestedWeight.gt(currentAvailability.availableWeight)) {
      throw new PortionAvailabilityExceededError();
    }

    const createdAt = this.clock.now();
    const createdPortions = command.portions.map((portion) =>
      ServedPortion.create({
        id: crypto.randomUUID(),
        preparedBatchId: batch.id,
        adultProfileId: portion.adultProfileId,
        servedWeight: portion.servedWeight,
        servedAt,
        createdById: command.actorId,
        createdAt,
        updatedAt: createdAt,
      }),
    );
    await this.portions.saveMany(batch.id, createdPortions);

    const nutrientsPerGram = batch.nutrientsPerGram ?? {};
    return {
      preparedBatchId: batch.id,
      portions: createdPortions.map((portion) => ({
        id: portion.id,
        adultProfileId: portion.adultProfileId,
        servedWeight: portion.servedWeight,
        estimatedNutrition: Object.fromEntries(
          Object.entries(nutrientsPerGram).map(([code, amount]) => [
            code,
            amount.mul(portion.servedWeight),
          ]),
        ),
      })),
      availableWeight: currentAvailability.availableWeight.sub(requestedWeight),
    };
  }
}
