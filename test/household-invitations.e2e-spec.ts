import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { HouseholdInvitationView } from '../src/households/application/invitation-models/household-invitation-view';
import {
  HOUSEHOLD_INVITATION_REPOSITORY,
  HouseholdInvitationRepository,
} from '../src/households/application/invitation-ports/household-invitation-repository.port';
import {
  HOUSEHOLD_INVITATION_UNIT_OF_WORK,
  HouseholdInvitationUnitOfWork,
} from '../src/households/application/invitation-ports/household-invitation-unit-of-work.port';
import {
  INVITATION_TOKEN_SERVICE,
  InvitationTokenService,
} from '../src/households/application/invitation-ports/invitation-token-service.port';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../src/households/application/ports/household-repository.port';

const admin: CurrentUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  displayName: 'Administrador',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

const invitedUser: CurrentUser = {
  ...admin,
  id: 'invited-user-id',
  email: 'adulto@example.com',
  displayName: 'Adulto invitado',
};

const household = {
  id: 'household-id',
  name: 'Hogar Sojo',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  weeklyBudget: null,
  createdById: admin.id,
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
};

const pendingInvitation: HouseholdInvitationView = {
  id: 'invitation-id',
  householdId: household.id,
  email: invitedUser.email,
  role: 'MEMBER',
  status: 'PENDING',
  expiresAt: new Date('2099-08-06T12:00:00.000Z'),
  invitedById: admin.id,
  acceptedById: null,
  createdAt: new Date('2026-07-30T12:00:00.000Z'),
  updatedAt: new Date('2026-07-30T12:00:00.000Z'),
};

interface InvitationResponseBody {
  id: string;
  email: string;
  status: string;
  acceptedById?: string | null;
  token?: string;
  tokenHash?: string;
}

describe('Household invitations HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const households: jest.Mocked<HouseholdRepository> = {
    findActiveForUser: jest.fn(),
    findAccess: jest.fn(),
    updateName: jest.fn(),
  };
  const invitations: jest.Mocked<HouseholdInvitationRepository> = {
    findById: jest.fn(),
    findByTokenHash: jest.fn(),
    findByHouseholdAndEmail: jest.fn(),
    hasActiveMembershipForEmail: jest.fn(),
    hasActiveMembershipForUser: jest.fn(),
    listByHousehold: jest.fn(),
    create: jest.fn(),
    cancel: jest.fn(),
  };
  const unitOfWork: jest.Mocked<HouseholdInvitationUnitOfWork> = {
    accept: jest.fn(),
  };
  const tokenService: jest.Mocked<InvitationTokenService> = {
    generate: jest.fn(),
    hash: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(HOUSEHOLD_REPOSITORY)
      .useValue(households)
      .overrideProvider(HOUSEHOLD_INVITATION_REPOSITORY)
      .useValue(invitations)
      .overrideProvider(HOUSEHOLD_INVITATION_UNIT_OF_WORK)
      .useValue(unitOfWork)
      .overrideProvider(INVITATION_TOKEN_SERVICE)
      .useValue(tokenService)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getCurrentUser.execute.mockReset().mockResolvedValue(admin);
    households.findAccess.mockReset().mockResolvedValue({
      household,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    invitations.findById.mockReset();
    invitations.findByTokenHash.mockReset();
    invitations.findByHouseholdAndEmail.mockReset().mockResolvedValue(null);
    invitations.hasActiveMembershipForEmail.mockReset().mockResolvedValue(false);
    invitations.hasActiveMembershipForUser.mockReset().mockResolvedValue(false);
    invitations.listByHousehold.mockReset();
    invitations.create.mockReset().mockImplementation((input) =>
      Promise.resolve({
        ...pendingInvitation,
        email: input.email,
        role: input.role,
        expiresAt: input.expiresAt,
      }),
    );
    invitations.cancel.mockReset();
    unitOfWork.accept.mockReset();
    tokenService.generate.mockReset().mockReturnValue({
      rawToken: 'raw-invitation-token',
      tokenHash: 'hashed-invitation-token',
    });
    tokenService.hash.mockReset().mockReturnValue('hashed-invitation-token');
  });

  it('creates an invitation and returns the raw token only in the response', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/households/${household.id}/invitations`)
      .set('Authorization', 'Bearer admin-token')
      .send({
        email: ' Adulto@Example.com ',
        role: 'MEMBER',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      id: pendingInvitation.id,
      householdId: household.id,
      email: invitedUser.email,
      role: 'MEMBER',
      status: 'PENDING',
      token: 'raw-invitation-token',
    });
    expect(invitations.create.mock.calls[0]?.[0]).toMatchObject({
      tokenHash: 'hashed-invitation-token',
    });
  });

  it('returns 409 for a duplicate invitation', async () => {
    invitations.findByHouseholdAndEmail.mockResolvedValue(pendingInvitation);

    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/invitations`)
      .set('Authorization', 'Bearer admin-token')
      .send({ email: invitedUser.email, role: 'MEMBER' })
      .expect(409);
  });

  it('returns 409 when inviting an active member', async () => {
    invitations.hasActiveMembershipForEmail.mockResolvedValue(true);

    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/invitations`)
      .set('Authorization', 'Bearer admin-token')
      .send({ email: invitedUser.email, role: 'MEMBER' })
      .expect(409);
  });

  it('returns 404 for an invalid invitation token', async () => {
    getCurrentUser.execute.mockResolvedValue(invitedUser);
    invitations.findByTokenHash.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/api/household-invitations/invalid-token/accept')
      .set('Authorization', 'Bearer invited-user-token')
      .expect(404);
  });

  it('returns 410 for an expired invitation', async () => {
    getCurrentUser.execute.mockResolvedValue(invitedUser);
    invitations.findByTokenHash.mockResolvedValue({
      ...pendingInvitation,
      status: 'EXPIRED',
      expiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    await request(app.getHttpServer())
      .post('/api/household-invitations/expired-token/accept')
      .set('Authorization', 'Bearer invited-user-token')
      .expect(410);
  });

  it('returns 403 when the authenticated email does not match', async () => {
    getCurrentUser.execute.mockResolvedValue({
      ...invitedUser,
      email: 'otro@example.com',
    });
    invitations.findByTokenHash.mockResolvedValue(pendingInvitation);

    await request(app.getHttpServer())
      .post('/api/household-invitations/raw-invitation-token/accept')
      .set('Authorization', 'Bearer other-user-token')
      .expect(403);
  });

  it('accepts the invitation and returns its accepted status', async () => {
    const acceptedInvitation: HouseholdInvitationView = {
      ...pendingInvitation,
      status: 'ACCEPTED',
      acceptedById: invitedUser.id,
    };
    getCurrentUser.execute.mockResolvedValue(invitedUser);
    invitations.findByTokenHash.mockResolvedValue(pendingInvitation);
    unitOfWork.accept.mockResolvedValue(acceptedInvitation);

    const response = await request(app.getHttpServer())
      .post('/api/household-invitations/raw-invitation-token/accept')
      .set('Authorization', 'Bearer invited-user-token')
      .expect(200);
    const body = JSON.parse(response.text) as InvitationResponseBody;

    expect(body).toMatchObject({
      id: pendingInvitation.id,
      status: 'ACCEPTED',
      acceptedById: invitedUser.id,
    });
  });

  it('returns 409 when accepting an invitation twice', async () => {
    getCurrentUser.execute.mockResolvedValue(invitedUser);
    invitations.findByTokenHash.mockResolvedValue({
      ...pendingInvitation,
      status: 'ACCEPTED',
      acceptedById: invitedUser.id,
    });

    await request(app.getHttpServer())
      .post('/api/household-invitations/raw-invitation-token/accept')
      .set('Authorization', 'Bearer invited-user-token')
      .expect(409);
  });

  it('lists invitations without exposing their token hashes', async () => {
    invitations.listByHousehold.mockResolvedValue([pendingInvitation]);

    const response = await request(app.getHttpServer())
      .get(`/api/households/${household.id}/invitations`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    const body = JSON.parse(response.text) as InvitationResponseBody[];

    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: pendingInvitation.id,
      email: invitedUser.email,
      status: 'PENDING',
    });
    expect(body[0]).not.toHaveProperty('token');
    expect(body[0]).not.toHaveProperty('tokenHash');
  });

  it('cancels a pending invitation', async () => {
    invitations.findById.mockResolvedValue(pendingInvitation);
    invitations.cancel.mockResolvedValue({
      ...pendingInvitation,
      status: 'CANCELLED',
    });

    const response = await request(app.getHttpServer())
      .post(`/api/household-invitations/${pendingInvitation.id}/cancel`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    const body = JSON.parse(response.text) as InvitationResponseBody;

    expect(body).toMatchObject({
      id: pendingInvitation.id,
      status: 'CANCELLED',
    });
  });
});
