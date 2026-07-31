import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';

export const GET_PREPARED_BATCH_USE_CASE = Symbol('GetPreparedBatchUseCase');

export class GetPreparedBatchUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
  ) {}

  async execute(actorId: string, batchId: string) {
    return findAccessiblePreparedBatch(actorId, batchId, this.households, this.batches);
  }
}
