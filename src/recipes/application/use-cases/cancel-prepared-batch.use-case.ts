import { Clock } from '../../../nutrition/application/ports/clock.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';

export const CANCEL_PREPARED_BATCH_USE_CASE = Symbol('CancelPreparedBatchUseCase');

export class CancelPreparedBatchUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actorId: string, batchId: string): Promise<void> {
    const batch = await findAccessiblePreparedBatch(
      actorId,
      batchId,
      this.households,
      this.batches,
    );
    batch.cancel(this.clock.now());
    await this.batches.save(batch);
  }
}
