import { EmailAlreadyRegisteredError } from '../errors/authentication.errors';
import { AuthenticationResult } from '../models/authentication-result';
import { AuthenticationTokenService } from '../services/authentication-token.service';
import { PasswordHasher } from '../ports/password-hasher.port';
import { UserRepository } from '../ports/user-repository.port';

export const REGISTER_USE_CASE = Symbol('RegisterUseCase');

export interface RegisterCommand {
  email: string;
  password: string;
  displayName: string | null;
}

export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly authenticationTokens: AuthenticationTokenService,
  ) {}

  async execute(command: RegisterCommand): Promise<AuthenticationResult> {
    const email = normalizeEmail(command.email);
    const existingUser = await this.users.findCredentialsByEmail(email);

    if (existingUser) throw new EmailAlreadyRegisteredError();

    const user = await this.users.create({
      email,
      passwordHash: await this.passwordHasher.hash(command.password),
      displayName: command.displayName?.trim() || null,
      avatarUrl: null,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
      lastLoginAt: null,
    });

    return this.authenticationTokens.createForUser(user);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
