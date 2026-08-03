import { CurrentUser } from '../models/current-user';
import { IdentityProvider } from '../ports/identity-provider.port';
import { UserRepository } from '../ports/user-repository.port';
import { InvalidIdentityError } from '../errors/invalid-identity.error';

export const GET_CURRENT_USER_USE_CASE = Symbol('GetCurrentUserUseCase');

export class GetCurrentUserUseCase {
  constructor(
    private readonly identityProvider: IdentityProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(accessToken: string): Promise<CurrentUser> {
    const identity = await this.identityProvider.verifyAccessToken(accessToken);
    const existingUser = await this.userRepository.findById(identity.userId);

    if (!existingUser) throw new InvalidIdentityError();

    return existingUser;
  }
}
