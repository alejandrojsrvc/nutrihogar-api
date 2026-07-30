export type HouseholdInvitationRole = 'ADMIN' | 'MEMBER';
export type HouseholdInvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';

export interface HouseholdInvitationView {
  id: string;
  householdId: string;
  email: string;
  role: HouseholdInvitationRole;
  status: HouseholdInvitationStatus;
  expiresAt: Date;
  invitedById: string;
  acceptedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatedHouseholdInvitation {
  invitation: HouseholdInvitationView;
  token: string;
}
