import {
  HouseholdInvitationRole,
  HouseholdInvitationView,
} from '../invitation-models/household-invitation-view';

export const HOUSEHOLD_INVITATION_REPOSITORY = Symbol('HouseholdInvitationRepository');

export interface CreateHouseholdInvitationInput {
  householdId: string;
  email: string;
  role: HouseholdInvitationRole;
  tokenHash: string;
  expiresAt: Date;
  invitedById: string;
}

export interface HouseholdInvitationRepository {
  findById(invitationId: string): Promise<HouseholdInvitationView | null>;
  findByTokenHash(tokenHash: string): Promise<HouseholdInvitationView | null>;
  findByHouseholdAndEmail(
    householdId: string,
    email: string,
  ): Promise<HouseholdInvitationView | null>;
  hasActiveMembershipForEmail(householdId: string, email: string): Promise<boolean>;
  hasActiveMembershipForUser(householdId: string, userId: string): Promise<boolean>;
  listByHousehold(householdId: string): Promise<HouseholdInvitationView[]>;
  create(input: CreateHouseholdInvitationInput): Promise<HouseholdInvitationView>;
  cancel(invitationId: string): Promise<HouseholdInvitationView | null>;
}
