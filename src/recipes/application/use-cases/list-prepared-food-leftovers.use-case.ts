import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import { PreparedFoodLeftoverAccessDeniedError } from '../errors/prepared-food-leftover-application.errors';
import { ListPreparedFoodLeftoversCommand } from '../models/prepared-food-leftover-command.models';

export const LIST_PREPARED_FOOD_LEFTOVERS_USE_CASE = Symbol('ListPreparedFoodLeftoversUseCase');

export class ListPreparedFoodLeftoversUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
  ) {}

  async execute(command: ListPreparedFoodLeftoversCommand) {
    const access = await this.households.findAccess(command.actorId, command.householdId);
    if (!access || access.status !== 'ACTIVE') {
      throw new PreparedFoodLeftoverAccessDeniedError();
    }
    return this.leftovers.list({ householdId: command.householdId, status: command.status });
  }
}
