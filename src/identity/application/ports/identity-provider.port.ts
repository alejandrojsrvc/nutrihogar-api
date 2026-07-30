import { AuthenticatedIdentity } from '../models/authenticated-identity';

export const IDENTITY_PROVIDER = Symbol('IdentityProvider');

export interface IdentityProvider {
  verifyAccessToken(accessToken: string): Promise<AuthenticatedIdentity>;
}
