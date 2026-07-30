import { HouseholdInvitationUnitOfWork } from '../invitation-ports/household-invitation-unit-of-work.port';
import { HouseholdInvitationRepository } from '../invitation-ports/household-invitation-repository.port';
import { InvitationTokenService } from '../invitation-ports/invitation-token-service.port';
import {
  HouseholdInvitationAlreadyHandledError,
  HouseholdInvitationAlreadyMemberError,
  HouseholdInvitationEmailMismatchError,
  HouseholdInvitationExpiredError,
  HouseholdInvitationNotFoundError,
} from '../invitation-errors/household-invitation.errors';
import { HouseholdInvitationView } from '../invitation-models/household-invitation-view';

export const ACCEPT_HOUSEHOLD_INVITATION_USE_CASE = Symbol(
  'AcceptHouseholdInvitationUseCase',
);

export interface AcceptHouseholdInvitationCommand {
  userId: string;
  userEmail: string;
  token: string;
}

export class AcceptHouseholdInvitationUseCase {
  constructor(
    private readonly invitations: HouseholdInvitationRepository,
    private readonly unitOfWork: HouseholdInvitationUnitOfWork,
    private readonly tokenService: InvitationTokenService,
  ) {}

  async execute(
    command: AcceptHouseholdInvitationCommand,
  ): Promise<HouseholdInvitationView> {
    const invitation = await this.invitations.findByTokenHash(
      this.tokenService.hash(command.token),
    );

    if (!invitation) {
      throw new HouseholdInvitationNotFoundError();
    }

    const now = new Date();

    if (
      invitation.status === 'EXPIRED' ||
      (invitation.status === 'PENDING' && invitation.expiresAt <= now)
    ) {
      throw new HouseholdInvitationExpiredError();
    }

    if (invitation.status !== 'PENDING') {
      throw new HouseholdInvitationAlreadyHandledError();
    }

    if (
      normalizeInvitationEmail(command.userEmail) !==
      normalizeInvitationEmail(invitation.email)
    ) {
      throw new HouseholdInvitationEmailMismatchError();
    }

    if (
      await this.invitations.hasActiveMembershipForUser(
        invitation.householdId,
        command.userId,
      )
    ) {
      throw new HouseholdInvitationAlreadyMemberError();
    }

    return this.unitOfWork.accept({
      invitationId: invitation.id,
      userId: command.userId,
      role: invitation.role,
      now,
    });
  }
}

function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}
