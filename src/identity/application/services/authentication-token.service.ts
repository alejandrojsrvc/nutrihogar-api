import { AuthenticationResult } from '../models/authentication-result';
import { AuthSession } from '../models/auth-session';
import { CurrentUser } from '../models/current-user';
import { AuthSessionRepository } from '../ports/auth-session-repository.port';
import { IdGenerator } from '../ports/id-generator.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { TokenProvider } from '../ports/token-provider.port';
import { InvalidRefreshTokenError } from '../errors/authentication.errors';

export class AuthenticationTokenService {
  constructor(
    private readonly tokens: TokenProvider,
    private readonly sessions: AuthSessionRepository,
    private readonly tokenHasher: TokenHasher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async createForUser(user: CurrentUser): Promise<AuthenticationResult> {
    const sessionId = this.idGenerator.generate();
    const refresh = await this.tokens.issueRefreshToken({
      userId: user.id,
      email: user.email,
      sessionId,
    });

    await this.sessions.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash: this.tokenHasher.hash(refresh.token),
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken: await this.tokens.issueAccessToken({ userId: user.id, email: user.email }),
      refreshToken: refresh.token,
      user,
    };
  }

  async rotateForUser(
    user: CurrentUser,
    session: AuthSession,
    currentRefreshToken: string,
    now: Date,
  ): Promise<AuthenticationResult> {
    const nextSessionId = this.idGenerator.generate();
    const refresh = await this.tokens.issueRefreshToken({
      userId: user.id,
      email: user.email,
      sessionId: nextSessionId,
    });
    const rotated = await this.sessions.rotate({
      sessionId: session.id,
      currentRefreshTokenHash: this.tokenHasher.hash(currentRefreshToken),
      nextSession: {
        id: nextSessionId,
        userId: user.id,
        refreshTokenHash: this.tokenHasher.hash(refresh.token),
        expiresAt: refresh.expiresAt,
      },
      now,
    });

    if (!rotated) throw new InvalidRefreshTokenError();

    return {
      accessToken: await this.tokens.issueAccessToken({ userId: user.id, email: user.email }),
      refreshToken: refresh.token,
      user,
    };
  }
}
