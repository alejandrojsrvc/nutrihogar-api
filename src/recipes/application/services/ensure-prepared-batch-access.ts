import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedBatchRepository } from '../ports/prepared-batch-repository.port';
import {
  PreparedBatchAccessDeniedError,
  PreparedBatchNotFoundError,
} from '../errors/prepared-batch-application.errors';

export async function findAccessiblePreparedBatch(
  actorId: string,
  batchId: string,
  households: HouseholdRepository,
  batches: PreparedBatchRepository,
) {
  const batch = await batches.findById(batchId);
  if (!batch) throw new PreparedBatchNotFoundError();

  const access = await households.findAccess(actorId, batch.householdId);
  if (!access || access.status !== 'ACTIVE') throw new PreparedBatchAccessDeniedError();

  return batch;
}
