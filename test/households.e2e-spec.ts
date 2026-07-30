import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { HouseholdAccess } from '../src/households/application/models/household-access';
import { HouseholdView } from '../src/households/application/models/household-view';
import { HOUSEHOLD_REPOSITORY } from '../src/households/application/ports/household-repository.port';
import { HOUSEHOLD_UNIT_OF_WORK } from '../src/households/application/ports/household-unit-of-work.port';
import { HouseholdRepository } from '../src/households/application/ports/household-repository.port';
import { HouseholdUnitOfWork } from '../src/households/application/ports/household-unit-of-work.port';

const currentUser: CurrentUser = {
  id: 'local-user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

const household: HouseholdView = {
  id: 'household-id',
  name: 'Hogar Sojo',
  timezone: 'America/Argentina/Buenos_Aires',
  currency: 'ARS',
  weeklyBudget: null,
  createdById: currentUser.id,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
};

describe('Households HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const repository: jest.Mocked<HouseholdRepository> = {
    findActiveForUser: jest.fn(),
    findAccess: jest.fn(),
    updateName: jest.fn(),
  };
  const unitOfWork: jest.Mocked<HouseholdUnitOfWork> = {
    createWithAdminMembership: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(HOUSEHOLD_REPOSITORY)
      .useValue(repository)
      .overrideProvider(HOUSEHOLD_UNIT_OF_WORK)
      .useValue(unitOfWork)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    getCurrentUser.execute.mockReset().mockResolvedValue(currentUser);
    repository.findActiveForUser.mockReset();
    repository.findAccess.mockReset();
    repository.updateName.mockReset();
    unitOfWork.createWithAdminMembership.mockReset();
  });

  it('creates a household for the authenticated user', async () => {
    unitOfWork.createWithAdminMembership.mockResolvedValue(household);

    await request(app.getHttpServer())
      .post('/api/households')
      .set('Authorization', 'Bearer valid-token')
      .send({
        name: household.name,
        timezone: household.timezone,
        currency: household.currency,
      })
      .expect(201)
      .expect({
        id: household.id,
        name: household.name,
        timezone: household.timezone,
        currency: household.currency,
        weeklyBudget: null,
        createdById: household.createdById,
        createdAt: household.createdAt.toISOString(),
        updatedAt: household.updatedAt.toISOString(),
      });

    expect(unitOfWork.createWithAdminMembership.mock.calls[0]?.[0]).toEqual({
      createdById: currentUser.id,
      name: household.name,
      timezone: household.timezone,
      currency: household.currency,
    });
  });

  it('rejects an empty household name', async () => {
    await request(app.getHttpServer())
      .post('/api/households')
      .set('Authorization', 'Bearer valid-token')
      .send({ name: ' ' })
      .expect(400);

    expect(unitOfWork.createWithAdminMembership.mock.calls).toHaveLength(0);
  });

  it('lists the authenticated user households', async () => {
    repository.findActiveForUser.mockResolvedValue([household]);

    await request(app.getHttpServer())
      .get('/api/households')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect([
        {
          id: household.id,
          name: household.name,
          timezone: household.timezone,
          currency: household.currency,
          weeklyBudget: null,
          createdById: household.createdById,
          createdAt: household.createdAt.toISOString(),
          updatedAt: household.updatedAt.toISOString(),
        },
      ]);
  });

  it('returns 403 when a non-member requests household detail', async () => {
    repository.findAccess.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/api/households/${household.id}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('allows an administrator to edit the household name', async () => {
    const access: HouseholdAccess = {
      household,
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    const updatedHousehold = { ...household, name: 'Hogar actualizado' };
    repository.findAccess.mockResolvedValue(access);
    repository.updateName.mockResolvedValue(updatedHousehold);

    await request(app.getHttpServer())
      .patch(`/api/households/${household.id}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: updatedHousehold.name })
      .expect(200)
      .expect({
        id: updatedHousehold.id,
        name: updatedHousehold.name,
        timezone: updatedHousehold.timezone,
        currency: updatedHousehold.currency,
        weeklyBudget: null,
        createdById: updatedHousehold.createdById,
        createdAt: updatedHousehold.createdAt.toISOString(),
        updatedAt: updatedHousehold.updatedAt.toISOString(),
      });
  });

  it('returns 403 when a common member tries to edit the household', async () => {
    repository.findAccess.mockResolvedValue({
      household,
      role: 'MEMBER',
      status: 'ACTIVE',
    });

    await request(app.getHttpServer())
      .patch(`/api/households/${household.id}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ name: 'Cambio no permitido' })
      .expect(403);

    expect(repository.updateName.mock.calls).toHaveLength(0);
  });
});
