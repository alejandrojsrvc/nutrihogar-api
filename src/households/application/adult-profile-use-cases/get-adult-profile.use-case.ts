import { AdultProfileNotFoundError } from '../adult-profile-errors/adult-profile.errors';
import { AdultProfileView } from '../adult-profile-models/adult-profile-view';
import { AdultProfileRepository } from '../adult-profile-ports/adult-profile-repository.port';
import { HouseholdRepository } from '../ports/household-repository.port';
import { ensureHouseholdMemberAccess } from './ensure-household-member-access';

export const GET_ADULT_PROFILE_USE_CASE = Symbol('GetAdultProfileUseCase');

export class GetAdultProfileUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly profiles: AdultProfileRepository,
  ) {}

  async execute(actorId: string, profileId: string): Promise<AdultProfileView> {
    const profile = await this.profiles.findActiveById(profileId);
    if (!profile) {
      throw new AdultProfileNotFoundError();
    }

    await ensureHouseholdMemberAccess(this.households, actorId, profile.householdId);

    return profile;
  }
}
