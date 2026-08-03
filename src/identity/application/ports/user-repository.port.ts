import { CurrentUser } from '../models/current-user';
import { UserCredentials } from '../models/user-credentials';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface CreateUserInput {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  passwordHash: string;
  lastLoginAt: Date | null;
}

export interface UserRepository {
  findById(userId: string): Promise<CurrentUser | null>;
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  create(input: CreateUserInput): Promise<CurrentUser>;
  updateLastLogin(userId: string, lastLoginAt: Date): Promise<CurrentUser>;
}
