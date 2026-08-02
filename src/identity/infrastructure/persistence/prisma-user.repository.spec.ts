import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository', () => {
  it('returns the concurrently created user when auth_provider_id is duplicated', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['auth_provider_id'] },
    });
    const user = {
      id: 'local-user-id',
      authProviderId: 'supabase-user-id',
      email: 'usuario@example.com',
      displayName: 'Alejandro',
      avatarUrl: null,
      timezone: 'America/Argentina/Buenos_Aires',
      locale: 'es-AR',
      lastLoginAt: new Date('2026-08-02T12:41:49.000Z'),
    };
    const create = jest.fn().mockRejectedValue(duplicate);
    const findUnique = jest.fn().mockResolvedValue(user);
    const repository = new PrismaUserRepository({
      user: { create, findUnique },
    } as unknown as PrismaService);

    const result = await repository.create({
      authProviderId: user.authProviderId,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      locale: user.locale,
      lastLoginAt: user.lastLoginAt,
    });

    expect(findUnique).toHaveBeenCalledWith({
      where: { authProviderId: user.authProviderId },
    });
    expect(result).toEqual({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      timezone: user.timezone,
      locale: user.locale,
    });
  });

  it('rethrows duplicate errors for other unique fields', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    });
    const create = jest.fn().mockRejectedValue(duplicate);
    const findUnique = jest.fn();
    const repository = new PrismaUserRepository({
      user: { create, findUnique },
    } as unknown as PrismaService);

    await expect(
      repository.create({
        authProviderId: 'supabase-user-id',
        email: 'usuario@example.com',
        displayName: 'Alejandro',
        avatarUrl: null,
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
        lastLoginAt: new Date(),
      }),
    ).rejects.toBe(duplicate);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
