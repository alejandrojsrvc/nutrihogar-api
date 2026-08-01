import { PreparedBatch } from '../../domain/entities/prepared-batch';

export const PREPARED_BATCH_REPOSITORY = Symbol('PreparedBatchRepository');

export interface PreparedBatchRepository {
  findById(id: string): Promise<PreparedBatch | null>;
  findByPlannedMealId(plannedMealId: string): Promise<PreparedBatch | null>;
  save(batch: PreparedBatch): Promise<void>;
  listAvailableByHousehold(householdId: string): Promise<PreparedBatch[]>;
}
