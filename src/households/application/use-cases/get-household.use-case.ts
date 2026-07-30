import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdView } from '../models/household-view';

export const GET_HOUSEHOLD_USE_CASE = Symbol('GetHouseholdUseCase');

export interface GetHouseholdCommand {
  actorId: string;
  householdId: string;
}

export class GetHouseholdUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(command: GetHouseholdCommand): Promise<HouseholdView> {
    const access = await this.households.findAccess(
      command.actorId,
      command.householdId,
    );

    if (!access || access.status !== 'ACTIVE') {
      throw new HouseholdAccessDeniedError();
    }

    return access.household;
  }
}
