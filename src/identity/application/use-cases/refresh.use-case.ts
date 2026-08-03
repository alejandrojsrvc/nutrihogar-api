import { InvalidRefreshTokenError } from '../errors/authentication.errors';
import { AuthenticationResult } from '../models/authentication-result';
import { AuthenticationTokenService } from '../services/authentication-token.service';
import { AuthSessionRepository } from '../ports/auth-session-repository.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { TokenProvider } from '../ports/token-provider.port';
import { UserRepository } from '../ports/user-repository.port';

export const REFRESH_USE_CASE = Symbol('RefreshUseCase');

export class RefreshUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: AuthSessionRepository,
    private readonly tokens: TokenProvider,
    private readonly tokenHasher: TokenHasher,
    private readonly authenticationTokens: AuthenticationTokenService,
  ) {}

  async execute(refreshToken: string): Promise<AuthenticationResult> {
    let claims;
    try {
      claims = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidRefreshTokenError();
    }

    const session = await this.sessions.findById(claims.sessionId);
    const now = new Date();
    if (
      !session ||
      session.userId !== claims.userId ||
      session.revokedAt !== null ||
      session.expiresAt <= now ||
      !this.tokenHasher.matches(refreshToken, session.refreshTokenHash)
    ) {
      throw new InvalidRefreshTokenError();
    }

    const user = await this.users.findById(claims.userId);
    if (!user) throw new InvalidRefreshTokenError();

    return this.authenticationTokens.rotateForUser(user, session, refreshToken, now);
  }
}
