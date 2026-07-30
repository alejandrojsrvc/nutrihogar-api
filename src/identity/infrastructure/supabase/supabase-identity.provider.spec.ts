import { ConfigService } from '@nestjs/config';
import { InvalidIdentityError } from '../../application/errors/invalid-identity.error';
import { SupabaseIdentityProvider } from './supabase-identity.provider';

describe('SupabaseIdentityProvider', () => {
  const configValues = {
    SUPABASE_URL: 'http://127.0.0.1:54321/',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
  };

  const configService = {
    get: jest.fn(
      (key: string) => configValues[key as keyof typeof configValues],
    ),
  } as unknown as ConfigService;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies the token through Supabase Auth and maps the identity', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'supabase-user-id',
          email: 'usuario@example.com',
          user_metadata: {
            full_name: 'Alejandro',
            avatar_url: 'https://example.com/avatar.png',
            timezone: 'America/Argentina/Buenos_Aires',
            locale: 'es-AR',
          },
        }),
    } as Response);
    const provider = new SupabaseIdentityProvider(configService);

    await expect(provider.verifyAccessToken('access-token')).resolves.toEqual({
      authProviderId: 'supabase-user-id',
      email: 'usuario@example.com',
      displayName: 'Alejandro',
      avatarUrl: 'https://example.com/avatar.png',
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54321/auth/v1/user',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          apikey: 'sb_publishable_local',
          Authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('rejects an invalid token without exposing Auth details', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'invalid token' }),
    } as Response);
    const provider = new SupabaseIdentityProvider(configService);

    await expect(
      provider.verifyAccessToken('invalid-token'),
    ).rejects.toBeInstanceOf(InvalidIdentityError);
  });
});
