import { AuthenticatedIdentity } from '../models/authenticated-identity';

export const TOKEN_PROVIDER = Symbol('TokenProvider');

export interface RefreshTokenClaims extends AuthenticatedIdentity {
  sessionId: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export interface TokenProvider {
  issueAccessToken(identity: AuthenticatedIdentity): Promise<string>;
  issueRefreshToken(identity: RefreshTokenClaims): Promise<IssuedRefreshToken>;
  verifyAccessToken(token: string): Promise<AuthenticatedIdentity>;
  verifyRefreshToken(token: string): Promise<RefreshTokenClaims>;
}
