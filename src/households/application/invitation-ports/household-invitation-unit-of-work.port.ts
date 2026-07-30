import {
  HouseholdInvitationRole,
  HouseholdInvitationView,
} from '../invitation-models/household-invitation-view';

export const HOUSEHOLD_INVITATION_UNIT_OF_WORK = Symbol(
  'HouseholdInvitationUnitOfWork',
);

export interface AcceptHouseholdInvitationInput {
  invitationId: string;
  userId: string;
  role: HouseholdInvitationRole;
  now: Date;
}

export interface HouseholdInvitationUnitOfWork {
  accept(
    input: AcceptHouseholdInvitationInput,
  ): Promise<HouseholdInvitationView>;
}
