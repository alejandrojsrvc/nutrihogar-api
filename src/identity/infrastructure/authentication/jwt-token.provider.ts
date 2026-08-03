import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InvalidIdentityError } from '../../application/errors/invalid-identity.error';
import { InvalidRefreshTokenError } from '../../application/errors/authentication.errors';
import { AuthenticatedIdentity } from '../../application/models/authenticated-identity';
import {
  IssuedRefreshToken,
  RefreshTokenClaims,
  TokenProvider,
} from '../../application/ports/token-provider.port';
import { IdentityProvider } from '../../application/ports/identity-provider.port';

interface JwtPayload {
  sub?: unknown;
  email?: unknown;
  sessionId?: unknown;
}

@Injectable()
export class JwtTokenProvider implements IdentityProvider, TokenProvider {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshSecret: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    this.accessSecret = config.getOrThrow<string>('JWT_ACCESS_SECRET');
    this.accessExpiresIn = config.getOrThrow<string>('JWT_ACCESS_EXPIRES_IN');
    this.refreshSecret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.refreshExpiresIn = config.getOrThrow<string>('JWT_REFRESH_EXPIRES_IN');
  }

  issueAccessToken(identity: AuthenticatedIdentity): Promise<string> {
    return this.jwt.signAsync(
      { sub: identity.userId, email: identity.email },
      this.signOptions(this.accessSecret, this.accessExpiresIn),
    );
  }

  async issueRefreshToken(identity: RefreshTokenClaims): Promise<IssuedRefreshToken> {
    return {
      token: await this.jwt.signAsync(
        { sub: identity.userId, email: identity.email, sessionId: identity.sessionId },
        this.signOptions(this.refreshSecret, this.refreshExpiresIn),
      ),
      expiresAt: new Date(Date.now() + parseDuration(this.refreshExpiresIn)),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedIdentity> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: this.accessSecret });
    } catch {
      throw new InvalidIdentityError();
    }

    if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
      throw new InvalidIdentityError();
    }

    return { userId: payload.sub, email: payload.email };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { secret: this.refreshSecret });
    } catch {
      throw new InvalidRefreshTokenError();
    }

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.sessionId !== 'string'
    ) {
      throw new InvalidRefreshTokenError();
    }

    return { userId: payload.sub, email: payload.email, sessionId: payload.sessionId };
  }

  private signOptions(secret: string, expiresIn: string): JwtSignOptions {
    return { secret, expiresIn: expiresIn as JwtSignOptions['expiresIn'] };
  }
}

function parseDuration(value: string): number {
  const match = /^(\d+)\s*(s|m|h|d)$/.exec(value.trim().toLowerCase());
  if (!match) throw new Error('Invalid JWT expiration format.');

  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return amount * multiplier;
}
