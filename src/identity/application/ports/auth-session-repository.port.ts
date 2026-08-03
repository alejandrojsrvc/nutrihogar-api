import { AuthSession } from '../models/auth-session';

export const AUTH_SESSION_REPOSITORY = Symbol('AuthSessionRepository');

export interface CreateAuthSessionInput {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  deviceId?: string | null;
}

export interface RotateAuthSessionInput {
  sessionId: string;
  currentRefreshTokenHash: string;
  nextSession: CreateAuthSessionInput;
  now: Date;
}

export interface AuthSessionRepository {
  create(input: CreateAuthSessionInput): Promise<AuthSession>;
  findById(sessionId: string): Promise<AuthSession | null>;
  rotate(input: RotateAuthSessionInput): Promise<boolean>;
  revoke(sessionId: string, refreshTokenHash: string, revokedAt: Date): Promise<boolean>;
}
