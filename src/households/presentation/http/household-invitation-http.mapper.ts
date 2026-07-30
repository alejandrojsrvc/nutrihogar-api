import { HouseholdInvitationView } from '../../application/invitation-models/household-invitation-view';
import { HouseholdInvitationResponseDto } from './invitation-dto/household-invitation-response.dto';

export class HouseholdInvitationHttpMapper {
  static toResponse(
    invitation: HouseholdInvitationView,
    token?: string,
  ): HouseholdInvitationResponseDto {
    return {
      id: invitation.id,
      householdId: invitation.householdId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      invitedById: invitation.invitedById,
      acceptedById: invitation.acceptedById,
      createdAt: invitation.createdAt.toISOString(),
      updatedAt: invitation.updatedAt.toISOString(),
      ...(token ? { token } : {}),
    };
  }

  static toResponseList(invitations: HouseholdInvitationView[]): HouseholdInvitationResponseDto[] {
    return invitations.map((invitation) => HouseholdInvitationHttpMapper.toResponse(invitation));
  }
}
