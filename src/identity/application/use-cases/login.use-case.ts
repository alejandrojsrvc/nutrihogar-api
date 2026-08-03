import { InvalidCredentialsError } from '../errors/authentication.errors';
import { AuthenticationResult } from '../models/authentication-result';
import { AuthenticationTokenService } from '../services/authentication-token.service';
import { PasswordHasher } from '../ports/password-hasher.port';
import { UserRepository } from '../ports/user-repository.port';
import { normalizeEmail } from './register.use-case';

export const LOGIN_USE_CASE = Symbol('LoginUseCase');

export interface LoginCommand {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authenticationTokens: AuthenticationTokenService,
  ) {}

  async execute(command: LoginCommand): Promise<AuthenticationResult> {
    const credentials = await this.users.findCredentialsByEmail(normalizeEmail(command.email));
    const valid = credentials?.passwordHash
      ? await this.passwordHasher.verify(credentials.passwordHash, command.password)
      : false;

    if (!credentials || !valid) throw new InvalidCredentialsError();

    const user = await this.users.updateLastLogin(credentials.id, new Date());
    return this.authenticationTokens.createForUser(user);
  }
}
