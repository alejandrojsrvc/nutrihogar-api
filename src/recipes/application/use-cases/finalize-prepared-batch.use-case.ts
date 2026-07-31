import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { Clock } from '../../../nutrition/application/ports/clock.port';
import { FinalizePreparedBatchCommand } from '../models/prepared-batch-command.models';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import { findAccessiblePreparedBatch } from '../services/ensure-prepared-batch-access';

export const FINALIZE_PREPARED_BATCH_USE_CASE = Symbol('FinalizePreparedBatchUseCase');

export class FinalizePreparedBatchUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly batches: PreparedBatchRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: FinalizePreparedBatchCommand) {
    const batch = await findAccessiblePreparedBatch(
      command.actorId,
      command.batchId,
      this.households,
      this.batches,
    );
    batch.finalize(command.finalCookedWeight, this.clock.now());
    await this.batches.save(batch);
    return batch;
  }
}
