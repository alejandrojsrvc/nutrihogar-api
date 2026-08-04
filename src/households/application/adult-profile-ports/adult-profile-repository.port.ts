import { AdultProfileView } from '../adult-profile-models/adult-profile-view';

export const ADULT_PROFILE_REPOSITORY = Symbol('AdultProfileRepository');

export interface AdultProfileRepository {
  findActiveByUserAndHousehold(userId: string, householdId: string): Promise<AdultProfileView | null>;
  findActiveById(profileId: string): Promise<AdultProfileView | null>;
  listActiveByHousehold(householdId: string): Promise<AdultProfileView[]>;
}
