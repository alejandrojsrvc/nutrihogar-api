import { PreparedBatchAvailability } from '../ports/served-portion-repository.port';
import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedBatch } from '../../domain/entities/prepared-batch';
import { ServedPortion } from '../../domain/entities/served-portion';

export interface PreparedBatchDetailsResult {
  batch: PreparedBatch;
  availability: PreparedBatchAvailability | null;
  servedPortions: ServedPortion[];
  leftovers: PreparedFoodLeftover[];
}
