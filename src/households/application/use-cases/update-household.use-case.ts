import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdNotFoundError } from '../errors/household-not-found.error';
import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdView } from '../models/household-view';

export const UPDATE_HOUSEHOLD_USE_CASE = Symbol('UpdateHouseholdUseCase');

export interface UpdateHouseholdCommand {
  actorId: string;
  householdId: string;
  name: string;
}

export class UpdateHouseholdUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(command: UpdateHouseholdCommand): Promise<HouseholdView> {
    const access = await this.households.findAccess(command.actorId, command.householdId);

    if (!access || access.status !== 'ACTIVE' || access.role !== 'ADMIN') {
      throw new HouseholdAccessDeniedError();
    }

    const household = await this.households.updateName(command.householdId, command.name);

    if (!household) {
      throw new HouseholdNotFoundError();
    }

    return household;
  }
}
