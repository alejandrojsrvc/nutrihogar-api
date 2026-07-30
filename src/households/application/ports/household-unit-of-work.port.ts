import { HouseholdView } from '../models/household-view';

export const HOUSEHOLD_UNIT_OF_WORK = Symbol('HouseholdUnitOfWork');

export interface CreateHouseholdInput {
  createdById: string;
  name: string;
  timezone: string;
  currency: string;
}

export interface HouseholdUnitOfWork {
  createWithAdminMembership(
    input: CreateHouseholdInput,
  ): Promise<HouseholdView>;
}
