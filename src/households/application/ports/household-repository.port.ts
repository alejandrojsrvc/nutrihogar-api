import { HouseholdAccess } from '../models/household-access';
import { HouseholdView } from '../models/household-view';

export const HOUSEHOLD_REPOSITORY = Symbol('HouseholdRepository');

export interface HouseholdRepository {
  findActiveForUser(userId: string): Promise<HouseholdView[]>;
  findAccess(userId: string, householdId: string): Promise<HouseholdAccess | null>;
  updateName(householdId: string, name: string): Promise<HouseholdView | null>;
}
