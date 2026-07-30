import { HouseholdInvitation as PrismaHouseholdInvitation } from '@prisma/client';
import { HouseholdInvitationView } from '../../application/invitation-models/household-invitation-view';

export class PrismaHouseholdInvitationMapper {
  static toView(invitation: PrismaHouseholdInvitation): HouseholdInvitationView {
    const isExpired = invitation.status === 'PENDING' && invitation.expiresAt <= new Date();

    return {
      id: invitation.id,
      householdId: invitation.householdId,
      email: invitation.email,
      role: invitation.role,
      status: isExpired ? 'EXPIRED' : invitation.status,
      expiresAt: invitation.expiresAt,
      invitedById: invitation.invitedById,
      acceptedById: invitation.acceptedById,
      createdAt: invitation.createdAt,
      updatedAt: invitation.updatedAt,
    };
  }
}
