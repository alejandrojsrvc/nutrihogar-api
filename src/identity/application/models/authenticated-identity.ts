export interface AuthenticatedIdentity {
  authProviderId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone?: string;
  locale?: string;
}
