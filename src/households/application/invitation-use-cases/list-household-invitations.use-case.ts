import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdInvitationRepository } from '../invitation-ports/household-invitation-repository.port';
import { HouseholdInvitationView } from '../invitation-models/household-invitation-view';
import { ensureHouseholdAdminAccess } from './ensure-household-admin-access';

export const LIST_HOUSEHOLD_INVITATIONS_USE_CASE = Symbol(
  'ListHouseholdInvitationsUseCase',
);

export interface ListHouseholdInvitationsCommand {
  actorId: string;
  householdId: string;
}

export class ListHouseholdInvitationsUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly invitations: HouseholdInvitationRepository,
  ) {}

  async execute(
    command: ListHouseholdInvitationsCommand,
  ): Promise<HouseholdInvitationView[]> {
    await ensureHouseholdAdminAccess(
      this.households,
      command.actorId,
      command.householdId,
    );

    return this.invitations.listByHousehold(command.householdId);
  }
}
