import Decimal from 'decimal.js';
import { ServedPortion } from '../../domain/entities/served-portion';

export const SERVED_PORTION_REPOSITORY = Symbol('ServedPortionRepository');
export const SERVED_PORTION_UNIT_OF_WORK = Symbol('ServedPortionUnitOfWork');
export const PREPARED_BATCH_AVAILABILITY_REPOSITORY = Symbol('PreparedBatchAvailabilityRepository');

export interface PreparedBatchAvailability {
  finalCookedWeight: Decimal;
  servedWeight: Decimal;
  savedRemainderWeight: Decimal;
  discardedWeight: Decimal;
  availableWeight: Decimal;
}

export interface ServedPortionRepository {
  findById(id: string): Promise<ServedPortion | null>;
  save(portion: ServedPortion): Promise<void>;
  sumAllocatedWeight(batchId: string): Promise<Decimal>;
}

export interface PreparedBatchAvailabilityRepository {
  getAvailability(batchId: string): Promise<PreparedBatchAvailability | null>;
}

export interface ServedPortionUnitOfWork {
  saveMany(batchId: string, portions: ServedPortion[]): Promise<void>;
}
