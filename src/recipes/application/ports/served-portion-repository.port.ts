import Decimal from 'decimal.js';
import { ServedPortion } from '../../domain/entities/served-portion';
import { MealType } from '../../../meal-tracking/domain/models/meal.models';

export const SERVED_PORTION_REPOSITORY = Symbol('ServedPortionRepository');
export const SERVED_PORTION_UNIT_OF_WORK = Symbol('ServedPortionUnitOfWork');
export const PREPARED_BATCH_AVAILABILITY_REPOSITORY = Symbol('PreparedBatchAvailabilityRepository');
export const SERVED_PORTION_CONSUMPTION_UNIT_OF_WORK = Symbol('ServedPortionConsumptionUnitOfWork');

export interface PreparedBatchMealInput {
  id: string;
  householdId: string;
  adultProfileId: string;
  mealType: MealType;
  consumedAt: Date;
  createdById: string;
  item: {
    nameSnapshot: string;
    quantity: Decimal;
    nutrients: Array<{
      code: string;
      name: string;
      unit: string;
      amount: Decimal;
    }>;
  };
}

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

export interface ServedPortionConsumptionUnitOfWork {
  confirmConsumption(portion: ServedPortion, meal: PreparedBatchMealInput | null): Promise<void>;
}
