import { HouseholdAccessDeniedError } from '../errors/household-access-denied.error';
import {
  HouseholdInvitationAlreadyExistsError,
  HouseholdInvitationAlreadyHandledError,
  HouseholdInvitationAlreadyMemberError,
  HouseholdInvitationEmailMismatchError,
  HouseholdInvitationExpiredError,
  HouseholdInvitationNotFoundError,
} from '../invitation-errors/household-invitation.errors';
import { HouseholdInvitationView } from '../invitation-models/household-invitation-view';
import { HouseholdInvitationRepository } from '../invitation-ports/household-invitation-repository.port';
import { HouseholdInvitationUnitOfWork } from '../invitation-ports/household-invitation-unit-of-work.port';
import { InvitationTokenService } from '../invitation-ports/invitation-token-service.port';
import { HouseholdRepository } from '../ports/household-repository.port';
import { AcceptHouseholdInvitationUseCase } from './accept-household-invitation.use-case';
import { CancelHouseholdInvitationUseCase } from './cancel-household-invitation.use-case';
import { CreateHouseholdInvitationUseCase } from './create-household-invitation.use-case';
import { ListHouseholdInvitationsUseCase } from './list-household-invitations.use-case';

const now = new Date('2026-07-30T12:00:00.000Z');
const householdId = 'household-id';
const adminId = 'admin-id';
const invitedUserId = 'invited-user-id';

const pendingInvitation: HouseholdInvitationView = {
  id: 'invitation-id',
  householdId,
  email: 'adulto@example.com',
  role: 'MEMBER',
  status: 'PENDING',
  expiresAt: new Date('2026-08-06T12:00:00.000Z'),
  invitedById: adminId,
  acceptedById: null,
  createdAt: now,
  updatedAt: now,
};

describe('Household invitation use cases', () => {
  let households: jest.Mocked<HouseholdRepository>;
  let invitations: jest.Mocked<HouseholdInvitationRepository>;
  let unitOfWork: jest.Mocked<HouseholdInvitationUnitOfWork>;
  let tokenService: jest.Mocked<InvitationTokenService>;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(now);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    households = {
      findActiveForUser: jest.fn(),
      findAccess: jest.fn().mockResolvedValue({
        household: {
          id: householdId,
          name: 'Hogar Sojo',
          timezone: 'America/Argentina/Buenos_Aires',
          currency: 'ARS',
          weeklyBudget: null,
          createdById: adminId,
          createdAt: now,
          updatedAt: now,
        },
        role: 'ADMIN',
        status: 'ACTIVE',
      }),
      updateName: jest.fn(),
    };
    invitations = {
      findById: jest.fn(),
      findByTokenHash: jest.fn(),
      findByHouseholdAndEmail: jest.fn(),
      hasActiveMembershipForEmail: jest.fn().mockResolvedValue(false),
      hasActiveMembershipForUser: jest.fn().mockResolvedValue(false),
      listByHousehold: jest.fn(),
      create: jest.fn(),
      cancel: jest.fn(),
    };
    unitOfWork = {
      accept: jest.fn(),
    };
    tokenService = {
      generate: jest.fn().mockReturnValue({
        rawToken: 'raw-invitation-token',
        tokenHash: 'hashed-invitation-token',
      }),
      hash: jest.fn().mockReturnValue('hashed-invitation-token'),
    };
  });

  it('creates a seven-day invitation with a hashed token', async () => {
    invitations.findByHouseholdAndEmail.mockResolvedValue(null);
    invitations.create.mockImplementation((input) =>
      Promise.resolve({
        ...pendingInvitation,
        email: input.email,
        role: input.role,
        expiresAt: input.expiresAt,
      }),
    );
    const useCase = new CreateHouseholdInvitationUseCase(
      households,
      invitations,
      tokenService,
    );

    const result = await useCase.execute({
      actorId: adminId,
      householdId,
      email: ' Adulto@Example.com ',
      role: 'MEMBER',
    });

    expect(result.token).toBe('raw-invitation-token');
    expect(invitations.create.mock.calls[0]?.[0]).toEqual({
      householdId,
      email: 'adulto@example.com',
      role: 'MEMBER',
      tokenHash: 'hashed-invitation-token',
      expiresAt: new Date('2026-08-06T12:00:00.000Z'),
      invitedById: adminId,
    });
  });

  it('rejects invitations created by a common member', async () => {
    households.findAccess.mockResolvedValue({
      household: {
        id: householdId,
        name: 'Hogar Sojo',
        timezone: 'America/Argentina/Buenos_Aires',
        currency: 'ARS',
        weeklyBudget: null,
        createdById: adminId,
        createdAt: now,
        updatedAt: now,
      },
      role: 'MEMBER',
      status: 'ACTIVE',
    });
    const useCase = new CreateHouseholdInvitationUseCase(
      households,
      invitations,
      tokenService,
    );

    await expect(
      useCase.execute({
        actorId: 'member-id',
        householdId,
        email: pendingInvitation.email,
        role: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(HouseholdAccessDeniedError);
  });

  it('rejects a duplicate pending invitation', async () => {
    invitations.findByHouseholdAndEmail.mockResolvedValue(pendingInvitation);
    const useCase = new CreateHouseholdInvitationUseCase(
      households,
      invitations,
      tokenService,
    );

    await expect(
      useCase.execute({
        actorId: adminId,
        householdId,
        email: pendingInvitation.email,
        role: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationAlreadyExistsError);
    expect(invitations.create.mock.calls).toHaveLength(0);
  });

  it('rejects an invitation for an active household member', async () => {
    invitations.hasActiveMembershipForEmail.mockResolvedValue(true);
    const useCase = new CreateHouseholdInvitationUseCase(
      households,
      invitations,
      tokenService,
    );

    await expect(
      useCase.execute({
        actorId: adminId,
        householdId,
        email: pendingInvitation.email,
        role: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationAlreadyMemberError);
  });

  it('rejects an invalid invitation token', async () => {
    invitations.findByTokenHash.mockResolvedValue(null);
    const useCase = new AcceptHouseholdInvitationUseCase(
      invitations,
      unitOfWork,
      tokenService,
    );

    await expect(
      useCase.execute({
        userId: invitedUserId,
        userEmail: pendingInvitation.email,
        token: 'invalid-token',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationNotFoundError);
  });

  it('rejects an expired invitation', async () => {
    invitations.findByTokenHash.mockResolvedValue({
      ...pendingInvitation,
      expiresAt: new Date('2026-07-30T11:59:59.000Z'),
    });
    const useCase = new AcceptHouseholdInvitationUseCase(
      invitations,
      unitOfWork,
      tokenService,
    );

    await expect(
      useCase.execute({
        userId: invitedUserId,
        userEmail: pendingInvitation.email,
        token: 'expired-token',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationExpiredError);
  });

  it('rejects acceptance by a different email', async () => {
    invitations.findByTokenHash.mockResolvedValue(pendingInvitation);
    const useCase = new AcceptHouseholdInvitationUseCase(
      invitations,
      unitOfWork,
      tokenService,
    );

    await expect(
      useCase.execute({
        userId: invitedUserId,
        userEmail: 'otro@example.com',
        token: 'raw-invitation-token',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationEmailMismatchError);
  });

  it('rejects repeated acceptance', async () => {
    invitations.findByTokenHash.mockResolvedValue({
      ...pendingInvitation,
      status: 'ACCEPTED',
      acceptedById: invitedUserId,
    });
    const useCase = new AcceptHouseholdInvitationUseCase(
      invitations,
      unitOfWork,
      tokenService,
    );

    await expect(
      useCase.execute({
        userId: invitedUserId,
        userEmail: pendingInvitation.email,
        token: 'raw-invitation-token',
      }),
    ).rejects.toBeInstanceOf(HouseholdInvitationAlreadyHandledError);
  });

  it('accepts the invitation and delegates membership creation atomically', async () => {
    const acceptedInvitation: HouseholdInvitationView = {
      ...pendingInvitation,
      status: 'ACCEPTED',
      acceptedById: invitedUserId,
    };
    invitations.findByTokenHash.mockResolvedValue(pendingInvitation);
    unitOfWork.accept.mockResolvedValue(acceptedInvitation);
    const useCase = new AcceptHouseholdInvitationUseCase(
      invitations,
      unitOfWork,
      tokenService,
    );

    await expect(
      useCase.execute({
        userId: invitedUserId,
        userEmail: 'ADULTO@example.com',
        token: 'raw-invitation-token',
      }),
    ).resolves.toEqual(acceptedInvitation);
    expect(unitOfWork.accept.mock.calls[0]?.[0]).toEqual({
      invitationId: pendingInvitation.id,
      userId: invitedUserId,
      role: pendingInvitation.role,
      now,
    });
  });

  it('lists invitations for an administrator', async () => {
    invitations.listByHousehold.mockResolvedValue([pendingInvitation]);
    const useCase = new ListHouseholdInvitationsUseCase(
      households,
      invitations,
    );

    await expect(
      useCase.execute({ actorId: adminId, householdId }),
    ).resolves.toEqual([pendingInvitation]);
  });

  it('cancels a pending invitation as an administrator', async () => {
    const cancelledInvitation: HouseholdInvitationView = {
      ...pendingInvitation,
      status: 'CANCELLED',
    };
    invitations.findById.mockResolvedValue(pendingInvitation);
    invitations.cancel.mockResolvedValue(cancelledInvitation);
    const useCase = new CancelHouseholdInvitationUseCase(
      households,
      invitations,
    );

    await expect(
      useCase.execute({
        actorId: adminId,
        invitationId: pendingInvitation.id,
      }),
    ).resolves.toEqual(cancelledInvitation);
  });
});
