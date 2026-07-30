import {
  HouseholdInvitationAlreadyExistsError,
  HouseholdInvitationAlreadyMemberError,
} from '../invitation-errors/household-invitation.errors';
import {
  CreatedHouseholdInvitation,
  HouseholdInvitationRole,
} from '../invitation-models/household-invitation-view';
import { HouseholdRepository } from '../ports/household-repository.port';
import { HouseholdInvitationRepository } from '../invitation-ports/household-invitation-repository.port';
import { InvitationTokenService } from '../invitation-ports/invitation-token-service.port';
import { ensureHouseholdAdminAccess } from './ensure-household-admin-access';

export const CREATE_HOUSEHOLD_INVITATION_USE_CASE = Symbol('CreateHouseholdInvitationUseCase');

const invitationLifetimeMs = 7 * 24 * 60 * 60 * 1000;

export interface CreateHouseholdInvitationCommand {
  actorId: string;
  householdId: string;
  email: string;
  role: HouseholdInvitationRole;
}

export class CreateHouseholdInvitationUseCase {
  constructor(
    private readonly households: HouseholdRepository,
    private readonly invitations: HouseholdInvitationRepository,
    private readonly tokenService: InvitationTokenService,
  ) {}

  async execute(command: CreateHouseholdInvitationCommand): Promise<CreatedHouseholdInvitation> {
    await ensureHouseholdAdminAccess(this.households, command.actorId, command.householdId);

    const email = normalizeInvitationEmail(command.email);
    const isActiveMember = await this.invitations.hasActiveMembershipForEmail(
      command.householdId,
      email,
    );

    if (isActiveMember) {
      throw new HouseholdInvitationAlreadyMemberError();
    }

    const existingInvitation = await this.invitations.findByHouseholdAndEmail(
      command.householdId,
      email,
    );

    if (existingInvitation?.status === 'PENDING') {
      throw new HouseholdInvitationAlreadyExistsError();
    }

    const now = new Date();
    const generatedToken = this.tokenService.generate();
    const invitation = await this.invitations.create({
      householdId: command.householdId,
      email,
      role: command.role,
      tokenHash: generatedToken.tokenHash,
      expiresAt: new Date(now.getTime() + invitationLifetimeMs),
      invitedById: command.actorId,
    });

    return {
      invitation,
      token: generatedToken.rawToken,
    };
  }
}

function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}
