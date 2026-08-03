import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InvalidIdentityError } from '../../application/errors/invalid-identity.error';
import { InvalidRefreshTokenError } from '../../application/errors/authentication.errors';
import { JwtTokenProvider } from './jwt-token.provider';

describe('JwtTokenProvider', () => {
  const values = {
    JWT_ACCESS_SECRET: 'access-secret-that-is-long-enough-for-tests',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'refresh-secret-that-is-long-enough-for-tests',
    JWT_REFRESH_EXPIRES_IN: '30d',
  };
  const config = {
    getOrThrow: jest.fn((key: string) => values[key as keyof typeof values]),
  } as unknown as ConfigService;

  it('issues and verifies access and refresh tokens with different secrets', async () => {
    const provider = new JwtTokenProvider(new JwtService({}), config);
    const identity = { userId: 'user-id', email: 'usuario@example.com' };

    const accessToken = await provider.issueAccessToken(identity);
    const refresh = await provider.issueRefreshToken({ ...identity, sessionId: 'session-id' });

    await expect(provider.verifyAccessToken(accessToken)).resolves.toEqual(identity);
    await expect(provider.verifyRefreshToken(refresh.token)).resolves.toEqual({
      ...identity,
      sessionId: 'session-id',
    });
    expect(refresh.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects invalid and expired access tokens', async () => {
    const provider = new JwtTokenProvider(new JwtService({}), config);
    const jwt = new JwtService({});
    const expired = await jwt.signAsync(
      { sub: 'user-id', email: 'usuario@example.com' },
      { secret: values.JWT_ACCESS_SECRET, expiresIn: -1 },
    );

    await expect(provider.verifyAccessToken('invalid-token')).rejects.toBeInstanceOf(
      InvalidIdentityError,
    );
    await expect(provider.verifyAccessToken(expired)).rejects.toBeInstanceOf(InvalidIdentityError);
  });

  it('rejects refresh tokens signed with the access secret', async () => {
    const provider = new JwtTokenProvider(new JwtService({}), config);
    const token = await new JwtService({}).signAsync(
      { sub: 'user-id', email: 'usuario@example.com', sessionId: 'session-id' },
      { secret: values.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );

    await expect(provider.verifyRefreshToken(token)).rejects.toBeInstanceOf(
      InvalidRefreshTokenError,
    );
  });
});
