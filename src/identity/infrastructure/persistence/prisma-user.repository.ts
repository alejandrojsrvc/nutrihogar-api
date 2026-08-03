import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CurrentUser } from '../../application/models/current-user';
import { CreateUserInput, UserRepository } from '../../application/ports/user-repository.port';
import { UserCredentials } from '../../application/models/user-credentials';
import { EmailAlreadyRegisteredError } from '../../application/errors/authentication.errors';
import { PrismaUserMapper } from './prisma-user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string): Promise<CurrentUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? PrismaUserMapper.toCurrentUser(user) : null;
  }

  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });

    return user ? PrismaUserMapper.toCredentials(user) : null;
  }

  async create(input: CreateUserInput): Promise<CurrentUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          displayName: input.displayName,
          avatarUrl: input.avatarUrl,
          timezone: input.timezone,
          locale: input.locale,
          passwordHash: input.passwordHash,
          lastLoginAt: input.lastLoginAt,
        },
      });

      return PrismaUserMapper.toCurrentUser(user);
    } catch (error) {
      const isEmailDuplicate =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        (error.meta?.target === 'email' ||
          (Array.isArray(error.meta?.target) && error.meta.target.includes('email')));

      if (!isEmailDuplicate) {
        throw error;
      }

      throw new EmailAlreadyRegisteredError();
    }
  }

  async updateLastLogin(userId: string, lastLoginAt: Date): Promise<CurrentUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt },
    });

    return PrismaUserMapper.toCurrentUser(user);
  }
}
