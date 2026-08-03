export interface AuthSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  deviceId: string | null;
}
