import { IdentityProvider } from '../ports/identity-provider.port';
import { UserRepository } from '../ports/user-repository.port';
import { CurrentUser } from '../models/current-user';

export const GET_CURRENT_USER_USE_CASE = Symbol('GetCurrentUserUseCase');

const defaultTimezone = 'America/Argentina/Buenos_Aires';
const defaultLocale = 'es-AR';

export class GetCurrentUserUseCase {
  constructor(
    private readonly identityProvider: IdentityProvider,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(accessToken: string): Promise<CurrentUser> {
    const identity = await this.identityProvider.verifyAccessToken(accessToken);
    const now = new Date();
    const existingUser = await this.userRepository.findByAuthProviderId(
      identity.authProviderId,
    );

    if (!existingUser) {
      return this.userRepository.create({
        authProviderId: identity.authProviderId,
        email: identity.email,
        displayName: identity.displayName,
        avatarUrl: identity.avatarUrl,
        timezone: identity.timezone ?? defaultTimezone,
        locale: identity.locale ?? defaultLocale,
        lastLoginAt: now,
      });
    }

    return this.userRepository.updateLastLogin(existingUser.id, now);
  }
}
