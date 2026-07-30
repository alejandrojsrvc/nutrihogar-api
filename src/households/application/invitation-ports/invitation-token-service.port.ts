export const INVITATION_TOKEN_SERVICE = Symbol('InvitationTokenService');

export interface GeneratedInvitationToken {
  rawToken: string;
  tokenHash: string;
}

export interface InvitationTokenService {
  generate(): GeneratedInvitationToken;
  hash(rawToken: string): string;
}
