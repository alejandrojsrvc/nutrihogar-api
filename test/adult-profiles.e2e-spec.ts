import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { AdultProfileView } from '../src/households/application/adult-profile-models/adult-profile-view';
import {
  ADULT_PROFILE_REPOSITORY,
  AdultProfileRepository,
} from '../src/households/application/adult-profile-ports/adult-profile-repository.port';
import {
  ADULT_PROFILE_UNIT_OF_WORK,
  AdultProfileUnitOfWork,
} from '../src/households/application/adult-profile-ports/adult-profile-unit-of-work.port';
import { HouseholdAccess } from '../src/households/application/models/household-access';
import { HouseholdView } from '../src/households/application/models/household-view';
import {
  HOUSEHOLD_REPOSITORY,
  HouseholdRepository,
} from '../src/households/application/ports/household-repository.port';

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

const memberAccess: HouseholdAccess = {
  household,
  role: 'MEMBER',
  status: 'ACTIVE',
};

const profile: AdultProfileView = {
  id: 'profile-id',
  householdId: household.id,
  userId: currentUser.id,
  name: 'Alejandro',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  age: 36,
  biologicalSex: 'MALE',
  weightKg: 80.5,
  heightCm: 175.5,
  activityLevel: 'MODERATE',
  primaryGoal: 'MAINTENANCE',
  hasKitchenScale: true,
  isActive: true,
  createdAt: new Date('2026-07-30T10:00:00.000Z'),
  updatedAt: new Date('2026-07-30T10:00:00.000Z'),
  deletedAt: null,
  dietaryRestrictions: [
    {
      id: 'restriction-id',
      adultProfileId: 'profile-id',
      type: 'ALLERGY',
      name: 'Maní',
      severity: 'Severa',
      notes: null,
      createdAt: new Date('2026-07-30T10:00:00.000Z'),
      updatedAt: new Date('2026-07-30T10:00:00.000Z'),
    },
  ],
};

const profileResponse = {
  id: profile.id,
  householdId: profile.householdId,
  userId: profile.userId,
  name: profile.name,
  birthDate: '1990-05-20',
  age: profile.age,
  biologicalSex: profile.biologicalSex,
  weightKg: profile.weightKg,
  heightCm: profile.heightCm,
  activityLevel: profile.activityLevel,
  primaryGoal: profile.primaryGoal,
  hasKitchenScale: profile.hasKitchenScale,
  isActive: profile.isActive,
  createdAt: profile.createdAt.toISOString(),
  updatedAt: profile.updatedAt.toISOString(),
  dietaryRestrictions: [
    {
      id: 'restriction-id',
      adultProfileId: 'profile-id',
      type: 'ALLERGY',
      name: 'Maní',
      severity: 'Severa',
      notes: null,
      createdAt: '2026-07-30T10:00:00.000Z',
      updatedAt: '2026-07-30T10:00:00.000Z',
    },
  ],
};

const validRequest = {
  name: 'Alejandro',
  birthDate: '1990-05-20',
  biologicalSex: 'MALE',
  weightKg: 80.5,
  heightCm: 175.5,
  activityLevel: 'MODERATE',
  primaryGoal: 'MAINTENANCE',
  hasKitchenScale: true,
  dietaryRestrictions: [
    {
      type: 'ALLERGY',
      name: 'Maní',
      severity: 'Severa',
    },
  ],
};

describe('Adult profiles HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const households: jest.Mocked<HouseholdRepository> = {
    findActiveForUser: jest.fn(),
    findAccess: jest.fn(),
    updateName: jest.fn(),
  };
  const profiles: jest.Mocked<AdultProfileRepository> = {
    findActiveByUserAndHousehold: jest.fn(),
    findActiveById: jest.fn(),
    listActiveByHousehold: jest.fn(),
  };
  const unitOfWork: jest.Mocked<AdultProfileUnitOfWork> = {
    create: jest.fn(),
    update: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(HOUSEHOLD_REPOSITORY)
      .useValue(households)
      .overrideProvider(ADULT_PROFILE_REPOSITORY)
      .useValue(profiles)
      .overrideProvider(ADULT_PROFILE_UNIT_OF_WORK)
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
    households.findAccess.mockReset().mockResolvedValue(memberAccess);
    profiles.findActiveByUserAndHousehold.mockReset().mockResolvedValue(null);
    profiles.findActiveById.mockReset();
    profiles.listActiveByHousehold.mockReset();
    unitOfWork.create.mockReset();
    unitOfWork.update.mockReset();
  });

  it('creates a valid adult profile with dietary restrictions', async () => {
    unitOfWork.create.mockResolvedValue(profile);

    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/adult-profiles`)
      .set('Authorization', 'Bearer valid-token')
      .send(validRequest)
      .expect(201)
      .expect(profileResponse);

    expect(unitOfWork.create.mock.calls[0]?.[0]?.dietaryRestrictions).toEqual([
      {
        type: 'ALLERGY',
        name: 'Maní',
        severity: 'Severa',
        notes: null,
      },
    ]);
  });

  it('rejects a future birth date', async () => {
    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/adult-profiles`)
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validRequest, birthDate: '2999-01-01' })
      .expect(400);

    expect(unitOfWork.create.mock.calls).toHaveLength(0);
  });

  it('rejects a negative height', async () => {
    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/adult-profiles`)
      .set('Authorization', 'Bearer valid-token')
      .send({ ...validRequest, heightCm: -10 })
      .expect(400);

    expect(unitOfWork.create.mock.calls).toHaveLength(0);
  });

  it('rejects a duplicate active profile', async () => {
    profiles.findActiveByUserAndHousehold.mockResolvedValue(profile);

    await request(app.getHttpServer())
      .post(`/api/households/${household.id}/adult-profiles`)
      .set('Authorization', 'Bearer valid-token')
      .send(validRequest)
      .expect(409);
  });

  it('lists active adult profiles for a household member', async () => {
    profiles.listActiveByHousehold.mockResolvedValue([profile]);

    await request(app.getHttpServer())
      .get(`/api/households/${household.id}/adult-profiles`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect([profileResponse]);
  });

  it('denies detail access from another household', async () => {
    profiles.findActiveById.mockResolvedValue(profile);
    households.findAccess.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/api/adult-profiles/${profile.id}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('allows a household administrator to edit another adult profile', async () => {
    const memberProfile = { ...profile, userId: 'other-member-id' };
    const updatedProfile = { ...memberProfile, heightCm: 180 };
    profiles.findActiveById.mockResolvedValue(memberProfile);
    households.findAccess.mockResolvedValue({
      household,
      role: 'ADMIN',
      status: 'ACTIVE',
    });
    unitOfWork.update.mockResolvedValue(updatedProfile);

    await request(app.getHttpServer())
      .patch(`/api/adult-profiles/${profile.id}`)
      .set('Authorization', 'Bearer valid-token')
      .send({ heightCm: 180 })
      .expect(200)
      .expect({
        ...profileResponse,
        userId: 'other-member-id',
        heightCm: 180,
      });
  });
});
