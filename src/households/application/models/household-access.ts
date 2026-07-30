import { HouseholdView } from './household-view';

export type HouseholdRole = 'ADMIN' | 'MEMBER';
export type HouseholdMembershipStatus = 'ACTIVE' | 'INACTIVE';

export interface HouseholdAccess {
  household: HouseholdView;
  role: HouseholdRole;
  status: HouseholdMembershipStatus;
}
