import { PreparedFoodLeftover } from '../../domain/entities/prepared-food-leftover';
import { PreparedFoodLeftoverStatus } from '../../domain/models/prepared-food-leftover.models';

export const PREPARED_FOOD_LEFTOVER_REPOSITORY = Symbol('PreparedFoodLeftoverRepository');

export interface PreparedFoodLeftoverListCriteria {
  householdId: string;
  status?: PreparedFoodLeftoverStatus;
}

export interface PreparedFoodLeftoverRepository {
  findById(id: string): Promise<PreparedFoodLeftover | null>;
  list(criteria: PreparedFoodLeftoverListCriteria): Promise<PreparedFoodLeftover[]>;
  save(leftover: PreparedFoodLeftover): Promise<void>;
  updateStatus(leftover: PreparedFoodLeftover): Promise<void>;
}
