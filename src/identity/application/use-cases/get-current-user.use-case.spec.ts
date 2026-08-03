/* eslint-disable @typescript-eslint/unbound-method */
import { InvalidIdentityError } from '../errors/invalid-identity.error';
import { AuthenticatedIdentity } from '../models/authenticated-identity';
import { CurrentUser } from '../models/current-user';
import { IdentityProvider } from '../ports/identity-provider.port';
import { UserRepository } from '../ports/user-repository.port';
import { GetCurrentUserUseCase } from './get-current-user.use-case';

const identity: AuthenticatedIdentity = {
  userId: 'local-user-id',
  email: 'usuario@example.com',
};

const currentUser: CurrentUser = {
  id: identity.userId,
  email: identity.email,
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

describe('GetCurrentUserUseCase', () => {
  let identityProvider: jest.Mocked<IdentityProvider>;
  let userRepository: jest.Mocked<UserRepository>;
  let useCase: GetCurrentUserUseCase;

  beforeEach(() => {
    identityProvider = { verifyAccessToken: jest.fn().mockResolvedValue(identity) };
    userRepository = {
      findById: jest.fn(),
      findCredentialsByEmail: jest.fn(),
      create: jest.fn(),
      updateLastLogin: jest.fn(),
    };
    useCase = new GetCurrentUserUseCase(identityProvider, userRepository);
  });

  it('resolves an existing user from the JWT subject', async () => {
    userRepository.findById.mockResolvedValue(currentUser);

    await expect(useCase.execute('access-token')).resolves.toEqual(currentUser);
    expect(userRepository.findById).toHaveBeenCalledWith(identity.userId);
    expect(userRepository.create).not.toHaveBeenCalled();
    expect(userRepository.updateLastLogin).not.toHaveBeenCalled();
  });

  it('rejects a validly signed token when the user no longer exists', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('access-token')).rejects.toBeInstanceOf(InvalidIdentityError);
    expect(userRepository.create).not.toHaveBeenCalled();
  });
});
