import { User as PrismaUser } from '@prisma/client';
import { CurrentUser } from '../../application/models/current-user';
import { UserCredentials } from '../../application/models/user-credentials';

export class PrismaUserMapper {
  static toCurrentUser(user: PrismaUser): CurrentUser {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      locale: user.locale,
    };
  }

  static toCredentials(user: Pick<PrismaUser, 'id' | 'email' | 'passwordHash'>): UserCredentials {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
    };
  }
}
