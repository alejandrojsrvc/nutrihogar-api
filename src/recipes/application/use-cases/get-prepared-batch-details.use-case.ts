import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchAvailabilityRepository,
  ServedPortionRepository,
} from '../ports/served-portion-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import { PreparedBatchDetailsResult } from '../models/prepared-batch-details.models';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';

export const GET_PREPARED_BATCH_DETAILS_USE_CASE = Symbol('GetPreparedBatchDetailsUseCase');

export class GetPreparedBatchDetailsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly availability: PreparedBatchAvailabilityRepository,
    private readonly portions: ServedPortionRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
  ) {}

  async execute(actorId: string, batchId: string): Promise<PreparedBatchDetailsResult> {
    const batch = await findAccessiblePreparedBatch(
      actorId,
      batchId,
      this.households,
      this.batches,
    );
    const [availability, servedPortions, leftovers] = await Promise.all([
      this.availability.getAvailability(batchId),
      this.portions.findByPreparedBatchId(batchId),
      this.leftovers.listByPreparedBatchId(batchId),
    ]);

    return { batch, availability, servedPortions, leftovers };
  }
}
