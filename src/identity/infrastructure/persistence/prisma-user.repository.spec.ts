import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { EmailAlreadyRegisteredError } from '../../application/errors/authentication.errors';
import { PrismaUserRepository } from './prisma-user.repository';

describe('PrismaUserRepository', () => {
  it('maps credentials without exposing unrelated user fields', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'local-user-id',
      email: 'usuario@example.com',
      passwordHash: '$argon2id$v=19$hash',
    });
    const repository = new PrismaUserRepository({
      user: { findUnique },
    } as unknown as PrismaService);

    await expect(repository.findCredentialsByEmail('usuario@example.com')).resolves.toEqual({
      id: 'local-user-id',
      email: 'usuario@example.com',
      passwordHash: '$argon2id$v=19$hash',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: 'usuario@example.com' },
      select: { id: true, email: true, passwordHash: true },
    });
  });

  it('maps a duplicate email to an application error', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: '6.19.3',
      meta: { target: ['email'] },
    });
    const create = jest.fn().mockRejectedValue(duplicate);
    const repository = new PrismaUserRepository({
      user: { create },
    } as unknown as PrismaService);

    await expect(
      repository.create({
        email: 'usuario@example.com',
        passwordHash: '$argon2id$v=19$hash',
        displayName: 'Alejandro',
        avatarUrl: null,
        timezone: 'America/Argentina/Buenos_Aires',
        locale: 'es-AR',
        lastLoginAt: null,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});
