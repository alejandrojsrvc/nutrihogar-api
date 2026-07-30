import { AdultProfileView } from '../adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../ports/household-repository.port';
import { ensureHouseholdMemberAccess } from './ensure-household-member-access';

export const LIST_ADULT_PROFILES_USE_CASE = Symbol('ListAdultProfilesUseCase');

export class ListAdultProfilesUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly profiles: AdultProfileRepository,
  ) {}

  async execute(actorId: string, householdId: string): Promise<AdultProfileView[]> {
    await ensureHouseholdMemberAccess(this.households, actorId, householdId);

    return this.profiles.listActiveByHousehold(householdId);
  }
}
