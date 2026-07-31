import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import {
  PreparedFoodLeftoverAccessDeniedError,
  PreparedFoodLeftoverNotFoundError,
} from '../errors/prepared-food-leftover-application.errors';

export const GET_PREPARED_FOOD_LEFTOVER_USE_CASE = Symbol('GetPreparedFoodLeftoverUseCase');

export class GetPreparedFoodLeftoverUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
  ) {}

  async execute(actorId: string, leftoverId: string) {
    const leftover = await this.leftovers.findById(leftoverId);
    if (!leftover) throw new PreparedFoodLeftoverNotFoundError();
    const access = await this.households.findAccess(actorId, leftover.householdId);
    if (!access || access.status !== 'ACTIVE') {
      throw new PreparedFoodLeftoverAccessDeniedError();
    }
    return leftover;
  }
}
