import {
  HouseholdInvitation,
  HouseholdInvitationRole,
  HouseholdInvitationStatus,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { PrismaHouseholdInvitationUnitOfWork } from './prisma-household-invitation.unit-of-work';

interface InvitationUpdateManyInput {
  where: {
    id: string;
    status: HouseholdInvitationStatus;
    expiresAt: { gt: Date };
  };
  data: {
    status: HouseholdInvitationStatus;
    acceptedById: string;
  };
}

interface MembershipCreateInput {
  data: {
    householdId: string;
    userId: string;
    role: HouseholdInvitationRole;
    status: 'ACTIVE';
  };
}

describe('PrismaHouseholdInvitationUnitOfWork', () => {
  it('accepts the invitation and creates the active membership in one transaction', async () => {
    const invitation: HouseholdInvitation = {
      id: 'invitation-id',
      householdId: 'household-id',
      email: 'adulto@example.com',
      tokenHash: 'token-hash',
      role: HouseholdInvitationRole.MEMBER,
      status: HouseholdInvitationStatus.PENDING,
      expiresAt: new Date('2026-08-06T12:00:00.000Z'),
      invitedById: 'admin-id',
      acceptedById: null,
      createdAt: new Date('2026-07-30T12:00:00.000Z'),
      updatedAt: new Date('2026-07-30T12:00:00.000Z'),
    };
    const acceptedInvitation: HouseholdInvitation = {
      ...invitation,
      status: HouseholdInvitationStatus.ACCEPTED,
      acceptedById: 'invited-user-id',
    };
    const updateInvitation: jest.MockedFunction<
      (input: InvitationUpdateManyInput) => Promise<{ count: number }>
    > = jest.fn().mockResolvedValue({ count: 1 });
    const createMembership: jest.MockedFunction<
      (input: MembershipCreateInput) => Promise<object>
    > = jest.fn().mockResolvedValue({});
    const transactionClient = {
      householdInvitation: {
        findUnique: jest.fn().mockResolvedValue(invitation),
        updateMany: updateInvitation,
        findUniqueOrThrow: jest.fn().mockResolvedValue(acceptedInvitation),
      },
      householdMembership: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: createMembership,
        update: jest.fn(),
      },
    };
    const transaction = jest.fn(
      async (
        callback: (
          client: typeof transactionClient,
        ) => Promise<HouseholdInvitation>,
      ) => callback(transactionClient),
    );
    const prisma = { $transaction: transaction } as unknown as PrismaService;
    const unitOfWork = new PrismaHouseholdInvitationUnitOfWork(prisma);

    await expect(
      unitOfWork.accept({
        invitationId: invitation.id,
        userId: 'invited-user-id',
        role: 'MEMBER',
        now: new Date('2026-07-30T12:00:00.000Z'),
      }),
    ).resolves.toMatchObject({
      id: invitation.id,
      status: 'ACCEPTED',
      acceptedById: 'invited-user-id',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(updateInvitation.mock.calls[0]?.[0]).toEqual({
      where: {
        id: invitation.id,
        status: HouseholdInvitationStatus.PENDING,
        expiresAt: { gt: new Date('2026-07-30T12:00:00.000Z') },
      },
      data: {
        status: HouseholdInvitationStatus.ACCEPTED,
        acceptedById: 'invited-user-id',
      },
    });
    expect(createMembership.mock.calls[0]?.[0]).toEqual({
      data: {
        householdId: invitation.householdId,
        userId: 'invited-user-id',
        role: HouseholdInvitationRole.MEMBER,
        status: 'ACTIVE',
      },
    });
  });
});
