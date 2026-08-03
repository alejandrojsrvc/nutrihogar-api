/* eslint-disable @typescript-eslint/unbound-method */
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
} from '../errors/authentication.errors';
import { AuthenticationResult } from '../models/authentication-result';
import { AuthSession } from '../models/auth-session';
import { CurrentUser } from '../models/current-user';
import { AuthSessionRepository } from '../ports/auth-session-repository.port';
import { PasswordHasher } from '../ports/password-hasher.port';
import { TokenHasher } from '../ports/token-hasher.port';
import { RefreshTokenClaims, TokenProvider } from '../ports/token-provider.port';
import { UserRepository } from '../ports/user-repository.port';
import { AuthenticationTokenService } from '../services/authentication-token.service';
import { LoginUseCase } from './login.use-case';
import { LogoutUseCase } from './logout.use-case';
import { RefreshUseCase } from './refresh.use-case';
import { RegisterUseCase } from './register.use-case';

const user: CurrentUser = {
  id: 'user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

const result: AuthenticationResult = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user,
};

describe('authentication use cases', () => {
  let users: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let tokens: jest.Mocked<TokenProvider>;
  let sessions: jest.Mocked<AuthSessionRepository>;
  let tokenHasher: jest.Mocked<TokenHasher>;
  let authenticationTokens: jest.Mocked<AuthenticationTokenService>;

  beforeEach(() => {
    users = {
      findById: jest.fn(),
      findCredentialsByEmail: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    passwordHasher = { hash: jest.fn(), verify: jest.fn() };
    tokens = {
      issueAccessToken: jest.fn(),
      issueRefreshToken: jest.fn(),
      verifyAccessToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    };
    sessions = { create: jest.fn(), findById: jest.fn(), rotate: jest.fn(), revoke: jest.fn() };
    tokenHasher = { hash: jest.fn((value) => `hash:${value}`), matches: jest.fn() };
    authenticationTokens = {
      createForUser: jest.fn().mockResolvedValue(result),
      rotateForUser: jest.fn().mockResolvedValue(result),
    } as unknown as jest.Mocked<AuthenticationTokenService>;
  });

  it('registers with a normalized email and hashed password', async () => {
    passwordHasher.hash.mockResolvedValue('password-hash');
    users.findCredentialsByEmail.mockResolvedValue(null);
    users.create.mockResolvedValue(user);

    const useCase = new RegisterUseCase(users, passwordHasher, authenticationTokens);

    await expect(
      useCase.execute({
        email: ' Usuario@Example.COM ',
        password: 'password-seguro',
        displayName: ' Alejandro ',
      }),
    ).resolves.toEqual(result);
    expect(passwordHasher.hash).toHaveBeenCalledWith('password-seguro');
    expect(users.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'usuario@example.com',
        passwordHash: 'password-hash',
        displayName: 'Alejandro',
      }),
    );
  });

  it('rejects duplicate registration before hashing the password', async () => {
    users.findCredentialsByEmail.mockResolvedValue({
      id: user.id,
      email: user.email,
      passwordHash: 'hash',
    });
    const useCase = new RegisterUseCase(users, passwordHasher, authenticationTokens);

    await expect(
      useCase.execute({ email: user.email, password: 'password-seguro', displayName: null }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
    expect(passwordHasher.hash).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown user', null, false],
    ['wrong password', { id: user.id, email: user.email, passwordHash: 'hash' }, false],
  ])('returns the same credential error for %s', async (_case, credentials, valid) => {
    users.findCredentialsByEmail.mockResolvedValue(credentials);
    passwordHasher.verify.mockResolvedValue(valid);
    const useCase = new LoginUseCase(users, passwordHasher, authenticationTokens);

    await expect(useCase.execute({ email: user.email, password: 'wrong' })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(users.updateLastLogin).not.toHaveBeenCalled();
  });

  it('updates lastLoginAt before issuing tokens', async () => {
    users.findCredentialsByEmail.mockResolvedValue({
      id: user.id,
      email: user.email,
      passwordHash: 'hash',
    });
    passwordHasher.verify.mockResolvedValue(true);
    users.updateLastLogin.mockResolvedValue(user);
    const useCase = new LoginUseCase(users, passwordHasher, authenticationTokens);

    await expect(
      useCase.execute({ email: user.email, password: 'password-seguro' }),
    ).resolves.toEqual(result);
    expect(users.updateLastLogin).toHaveBeenCalledWith(user.id, expect.any(Date));
    expect(authenticationTokens.createForUser).toHaveBeenCalledWith(user);
  });

  it('rejects refresh tokens with a revoked or mismatched session', async () => {
    const claims: RefreshTokenClaims = {
      userId: user.id,
      email: user.email,
      sessionId: 'session-id',
    };
    const session: AuthSession = {
      id: claims.sessionId,
      userId: user.id,
      refreshTokenHash: 'stored-hash',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null,
      deviceId: null,
    };
    tokens.verifyRefreshToken.mockResolvedValue(claims);
    sessions.findById.mockResolvedValue(session);
    tokenHasher.matches.mockReturnValue(false);
    const useCase = new RefreshUseCase(users, sessions, tokens, tokenHasher, authenticationTokens);

    await expect(useCase.execute('refresh-token')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
    expect(authenticationTokens.rotateForUser).not.toHaveBeenCalled();
  });

  it('rotates a valid refresh session', async () => {
    const claims: RefreshTokenClaims = {
      userId: user.id,
      email: user.email,
      sessionId: 'session-id',
    };
    const session: AuthSession = {
      id: claims.sessionId,
      userId: user.id,
      refreshTokenHash: 'stored-hash',
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null,
      deviceId: null,
    };
    tokens.verifyRefreshToken.mockResolvedValue(claims);
    sessions.findById.mockResolvedValue(session);
    tokenHasher.matches.mockReturnValue(true);
    users.findById.mockResolvedValue(user);
    const useCase = new RefreshUseCase(users, sessions, tokens, tokenHasher, authenticationTokens);

    await expect(useCase.execute('refresh-token')).resolves.toEqual(result);
    expect(authenticationTokens.rotateForUser).toHaveBeenCalledWith(
      user,
      session,
      'refresh-token',
      expect.any(Date),
    );
  });

  it('revokes the matching refresh session on logout', async () => {
    tokens.verifyRefreshToken.mockResolvedValue({
      userId: user.id,
      email: user.email,
      sessionId: 'session-id',
    });
    sessions.revoke.mockResolvedValue(true);
    const useCase = new LogoutUseCase(sessions, tokens, tokenHasher);

    await expect(useCase.execute('refresh-token')).resolves.toBeUndefined();
    expect(sessions.revoke).toHaveBeenCalledWith(
      'session-id',
      'hash:refresh-token',
      expect.any(Date),
    );
  });
});
