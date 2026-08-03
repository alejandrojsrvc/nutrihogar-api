import { InvalidRefreshTokenError } from '../errors/authentication.errors';
import { AuthSessionRepository } from '../ports/auth-session-repository.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { TokenProvider } from '../ports/token-provider.port';

export const LOGOUT_USE_CASE = Symbol('LogoutUseCase');

export class LogoutUseCase {
  constructor(
    private readonly sessions: AuthSessionRepository,
    private readonly tokens: TokenProvider,
    private readonly tokenHasher: TokenHasher,
  ) {}

  async execute(refreshToken: string): Promise<void> {
    let claims;
    try {
      claims = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new InvalidRefreshTokenError();
    }

    const revoked = await this.sessions.revoke(
      claims.sessionId,
      this.tokenHasher.hash(refreshToken),
      new Date(),
    );
    if (!revoked) throw new InvalidRefreshTokenError();
  }
}
