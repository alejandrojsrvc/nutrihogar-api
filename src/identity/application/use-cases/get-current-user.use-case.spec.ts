import { AuthenticatedIdentity } from '../models/authenticated-identity';
import { CurrentUser } from '../models/current-user';
import { IdentityProvider } from '../ports/identity-provider.port';
import { CreateUserInput, UserRepository } from '../ports/user-repository.port';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

const identity: AuthenticatedIdentity = {
  authProviderId: 'supabase-user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
};

const currentUser: CurrentUser = {
  id: 'local-user-id',
  email: identity.email,
  displayName: identity.displayName,
  avatarUrl: identity.avatarUrl,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

describe('GetCurrentUserUseCase', () => {
  let identityProvider: jest.Mocked<IdentityProvider>;
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    identityProvider = {
      verifyAccessToken: jest.fn().mockResolvedValue(identity),
    };
    userRepository = {
      findByAuthProviderId: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    useCase = new GetCurrentUserUseCase(identityProvider, userRepository);
  });

  it('creates the local user on first access', async () => {
    userRepository.findByAuthProviderId.mockResolvedValue(null);
    userRepository.create.mockResolvedValue(currentUser);

    const result = await useCase.execute('access-token');

    expect(identityProvider.verifyAccessToken.mock.calls).toContainEqual([
      'access-token',
    ]);
    const createInput = userRepository.create.mock.calls[0]?.[0];

    expect(createInput).toEqual(
      expect.objectContaining<Partial<CreateUserInput>>({
        authProviderId: identity.authProviderId,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
      }),
    );
    expect(createInput?.lastLoginAt).toBeInstanceOf(Date);
    expect(result).toEqual(currentUser);
  });

  it('updates lastLoginAt for an existing local user', async () => {
    userRepository.findByAuthProviderId.mockResolvedValue(currentUser);
    userRepository.updateLastLogin.mockResolvedValue(currentUser);

    const result = await useCase.execute('access-token');

    const updateLastLoginInput = userRepository.updateLastLogin.mock.calls[0];

    expect(updateLastLoginInput?.[0]).toBe(currentUser.id);
    expect(updateLastLoginInput?.[1]).toBeInstanceOf(Date);
    expect(userRepository.create.mock.calls).toHaveLength(0);
    expect(result).toEqual(currentUser);
  });
});
