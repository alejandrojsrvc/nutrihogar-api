import { CurrentUser } from '../models/current-user';

export const USER_REPOSITORY = Symbol('UserRepository');

export interface CreateUserInput {
  authProviderId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  lastLoginAt: Date;
}

export interface UserRepository {
  findByAuthProviderId(authProviderId: string): Promise<CurrentUser | null>;
  create(input: CreateUserInput): Promise<CurrentUser>;
  updateLastLogin(userId: string, lastLoginAt: Date): Promise<CurrentUser>;
}
