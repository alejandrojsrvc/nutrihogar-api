import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import {
  AuthSessionRepository,
  CreateAuthSessionInput,
  RotateAuthSessionInput,
} from '../../application/ports/auth-session-repository.port';
import { AuthSession } from '../../application/models/auth-session';

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuthSessionInput): Promise<AuthSession> {
    const session = await this.prisma.authSession.create({ data: input });
    return toAuthSession(session);
  }

  async findById(sessionId: string): Promise<AuthSession | null> {
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
    return session ? toAuthSession(session) : null;
  }

  async rotate(input: RotateAuthSessionInput): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.authSession.updateMany({
        where: {
          id: input.sessionId,
          refreshTokenHash: input.currentRefreshTokenHash,
          revokedAt: null,
          expiresAt: { gt: input.now },
        },
        data: { revokedAt: input.now, lastUsedAt: input.now },
      });

      if (updated.count !== 1) return false;

      await transaction.authSession.create({ data: input.nextSession });
      return true;
    });
  }

  async revoke(sessionId: string, refreshTokenHash: string, revokedAt: Date): Promise<boolean> {
    const updated = await this.prisma.authSession.updateMany({
      where: { id: sessionId, refreshTokenHash, revokedAt: null },
      data: { revokedAt },
    });

    return updated.count === 1;
  }
}

function toAuthSession(session: Prisma.AuthSessionGetPayload<object>): AuthSession {
  return {
    id: session.id,
    userId: session.userId,
    refreshTokenHash: session.refreshTokenHash,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
    revokedAt: session.revokedAt,
    lastUsedAt: session.lastUsedAt,
    deviceId: session.deviceId,
  };
}
