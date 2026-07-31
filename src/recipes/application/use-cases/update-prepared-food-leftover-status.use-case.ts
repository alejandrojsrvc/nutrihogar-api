import { Clock } from '../../../nutrition/application/ports/clock.port';
import { HouseholdRepository } from '../../../households/application/ports/household-repository.port';
import { PreparedFoodLeftoverRepository } from '../ports/prepared-food-leftover-repository.port';
import {
  PreparedFoodLeftoverAccessDeniedError,
  PreparedFoodLeftoverNotFoundError,
} from '../errors/prepared-food-leftover-application.errors';
import { UpdatePreparedFoodLeftoverStatusCommand } from '../models/prepared-food-leftover-command.models';

export const UPDATE_PREPARED_FOOD_LEFTOVER_STATUS_USE_CASE = Symbol(
  'UpdatePreparedFoodLeftoverStatusUseCase',
);

export class UpdatePreparedFoodLeftoverStatusUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly leftovers: PreparedFoodLeftoverRepository,
    private readonly clock: Clock,
  ) {}

  async execute(command: UpdatePreparedFoodLeftoverStatusCommand) {
    const leftover = await this.leftovers.findById(command.leftoverId);
    if (!leftover) throw new PreparedFoodLeftoverNotFoundError();
    const access = await this.households.findAccess(command.actorId, leftover.householdId);
    if (!access || access.status !== 'ACTIVE') {
      throw new PreparedFoodLeftoverAccessDeniedError();
    }
    leftover.changeStatus(command.status, this.clock.now());
    await this.leftovers.updateStatus(leftover);
    return leftover;
  }
}
