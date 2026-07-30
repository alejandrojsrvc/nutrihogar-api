import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../application/models/current-user';
import { CreateUserInput, UserRepository } from '../../application/ports/user-repository.port';
import { PrismaUserMapper } from './prisma-user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthProviderId(authProviderId: string): Promise<CurrentUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { authProviderId },
    });

    return user ? PrismaUserMapper.toCurrentUser(user) : null;
  }

  async create(input: CreateUserInput): Promise<CurrentUser> {
    const user = await this.prisma.user.create({
      data: {
        authProviderId: input.authProviderId,
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        timezone: input.timezone,
        locale: input.locale,
        lastLoginAt: input.lastLoginAt,
      },
    });

    return PrismaUserMapper.toCurrentUser(user);
  }

  async updateLastLogin(userId: string, lastLoginAt: Date): Promise<CurrentUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt },
    });

    return PrismaUserMapper.toCurrentUser(user);
  }
}
