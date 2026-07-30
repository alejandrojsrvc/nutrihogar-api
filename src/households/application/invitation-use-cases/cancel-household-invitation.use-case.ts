import { HouseholdRepository } from '../ports/household-repository.port';
import {
  HouseholdInvitationAlreadyHandledError,
  HouseholdInvitationNotFoundError,
} from '../invitation-errors/household-invitation.errors';
import { HouseholdInvitationRepository } from '../invitation-ports/household-invitation-repository.port';
import { HouseholdInvitationView } from '../invitation-models/household-invitation-view';
import { ensureHouseholdAdminAccess } from './ensure-household-admin-access';

export const CANCEL_HOUSEHOLD_INVITATION_USE_CASE = Symbol('CancelHouseholdInvitationUseCase');

export interface CancelHouseholdInvitationCommand {
  actorId: string;
  invitationId: string;
}

export class CancelHouseholdInvitationUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly invitations: HouseholdInvitationRepository,
  ) {}

  async execute(command: CancelHouseholdInvitationCommand): Promise<HouseholdInvitationView> {
    const invitation = await this.invitations.findById(command.invitationId);

    if (!invitation) {
      throw new HouseholdInvitationNotFoundError();
    }

    await ensureHouseholdAdminAccess(this.households, command.actorId, invitation.householdId);

    if (invitation.status !== 'PENDING') {
      throw new HouseholdInvitationAlreadyHandledError();
    }

    const cancelledInvitation = await this.invitations.cancel(command.invitationId);

    if (!cancelledInvitation) {
      throw new HouseholdInvitationAlreadyHandledError();
    }

    return cancelledInvitation;
  }
}
