import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import Decimal from 'decimal.js';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { CurrentUser } from '../src/identity/application/models/current-user';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import { CLOCK } from '../src/nutrition/application/ports/clock.port';
import {
  NUTRITION_GOAL_REPOSITORY,
  NUTRITION_GOAL_UNIT_OF_WORK,
  NutritionGoalRepository,
  NutritionGoalUnitOfWork,
} from '../src/nutrition/application/ports/nutrition-goal-repository.port';
import {
  NUTRITION_PROFILE_REPOSITORY,
  NutritionCalculationProfile,
  NutritionProfileRepository,
} from '../src/nutrition/application/ports/nutrition-profile-repository.port';
import { CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE } from '../src/nutrition/application/use-cases/confirm-nutrition-goal-suggestion.use-case';
import { REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE } from '../src/nutrition/application/use-cases/reject-nutrition-goal-suggestion.use-case';
import { GET_CURRENT_NUTRITION_GOAL_USE_CASE } from '../src/nutrition/application/use-cases/get-current-nutrition-goal.use-case';
import { LIST_NUTRITION_GOALS_USE_CASE } from '../src/nutrition/application/use-cases/list-nutrition-goals.use-case';

describe('Nutrition goal suggestions HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const goals: jest.Mocked<NutritionGoalRepository> = {
    canAccessProfile: jest.fn(),
    findSuggestionById: jest.fn(),
    findCurrentByProfile: jest.fn(),
    listByProfile: jest.fn(),
  };
  const profiles: jest.Mocked<NutritionProfileRepository> = {
    findActiveById: jest.fn(),
  };
  const unitOfWork: jest.Mocked<NutritionGoalUnitOfWork> = {
    createSuggestion: jest.fn(),
    confirmSuggestion: jest.fn(),
    rejectSuggestion: jest.fn(),
    expireSuggestion: jest.fn(),
  };
  const confirmSuggestion = { execute: jest.fn() };
  const rejectSuggestion = { execute: jest.fn() };
  const getCurrentGoal = { execute: jest.fn() };
  const listGoals = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(NUTRITION_GOAL_REPOSITORY)
      .useValue(goals)
      .overrideProvider(NUTRITION_PROFILE_REPOSITORY)
      .useValue(profiles)
      .overrideProvider(NUTRITION_GOAL_UNIT_OF_WORK)
      .useValue(unitOfWork)
      .overrideProvider(CONFIRM_NUTRITION_GOAL_SUGGESTION_USE_CASE)
      .useValue(confirmSuggestion)
      .overrideProvider(REJECT_NUTRITION_GOAL_SUGGESTION_USE_CASE)
      .useValue(rejectSuggestion)
      .overrideProvider(GET_CURRENT_NUTRITION_GOAL_USE_CASE)
      .useValue(getCurrentGoal)
      .overrideProvider(LIST_NUTRITION_GOALS_USE_CASE)
      .useValue(listGoals)
      .overrideProvider(CLOCK)
      .useValue({ now: () => now })
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
    goals.canAccessProfile.mockReset().mockResolvedValue(true);
    profiles.findActiveById.mockReset().mockResolvedValue(profile);
    unitOfWork.createSuggestion.mockReset().mockResolvedValue(suggestion);
    confirmSuggestion.execute.mockReset().mockResolvedValue(goal);
    rejectSuggestion.execute.mockReset().mockResolvedValue(undefined);
    getCurrentGoal.execute.mockReset().mockResolvedValue(goal);
    listGoals.execute.mockReset().mockResolvedValue([goal]);
  });

  it('creates a pending nutrition goal suggestion', async () => {
    await request(app.getHttpServer())
      .post(`/api/adult-profiles/${profile.id}/nutrition-goal-suggestions`)
      .set('Authorization', 'Bearer valid-token')
      .expect(201)
      .expect({
        id: suggestion.id,
        calculation: {
          bmr: 1719,
          activityFactor: 1.55,
          tdee: 2664,
        },
        suggestion: {
          dailyCalories: 2131,
          proteinGrams: 160,
          carbohydrateGrams: 240,
          fatGrams: 59,
          fiberGrams: 30,
        },
        status: 'PENDING',
      });
  });

  it('rejects an incomplete profile', async () => {
    profiles.findActiveById.mockResolvedValue({ ...profile, weightKg: null });

    await request(app.getHttpServer())
      .post(`/api/adult-profiles/${profile.id}/nutrition-goal-suggestions`)
      .set('Authorization', 'Bearer valid-token')
      .expect(400);

    expect(unitOfWork.createSuggestion.mock.calls).toHaveLength(0);
  });

  it('rejects a user from another household', async () => {
    goals.canAccessProfile.mockResolvedValue(false);

    await request(app.getHttpServer())
      .post(`/api/adult-profiles/${profile.id}/nutrition-goal-suggestions`)
      .set('Authorization', 'Bearer valid-token')
      .expect(403);

    expect(unitOfWork.createSuggestion.mock.calls).toHaveLength(0);
  });

  it('confirms a suggestion with edited values', async () => {
    await request(app.getHttpServer())
      .post('/api/nutrition-goal-suggestions/suggestion-id/confirm')
      .set('Authorization', 'Bearer valid-token')
      .send({ dailyCalories: 2150 })
      .expect(201)
      .expect({
        id: goal.id,
        adultProfileId: goal.adultProfileId,
        validFrom: goal.validFrom.toISOString(),
        validUntil: null,
        dailyCalories: 2150,
        proteinGrams: 170,
        carbohydrateGrams: 230,
        fatGrams: 67,
        fiberGrams: 30,
        goalType: 'FAT_LOSS',
        calculationMethod: 'MIFFLIN_ST_JEOR_V1',
        confirmedById: 'user-id',
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      });
    expect(confirmSuggestion.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-id', suggestionId: 'suggestion-id' }),
    );
  });

  it('rejects a suggestion and returns no content', async () => {
    await request(app.getHttpServer())
      .post('/api/nutrition-goal-suggestions/suggestion-id/reject')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);
    expect(rejectSuggestion.execute).toHaveBeenCalledWith({
      actorId: 'user-id',
      suggestionId: 'suggestion-id',
    });
  });

  it('returns the current goal and its history', async () => {
    await request(app.getHttpServer())
      .get(`/api/adult-profiles/${profile.id}/nutrition-goals/current`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) =>
        expect(response.body).toEqual(expect.objectContaining({ id: goal.id })),
      );

    await request(app.getHttpServer())
      .get(`/api/adult-profiles/${profile.id}/nutrition-goals`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) => expect(response.body).toHaveLength(1));
  });
});

const now = new Date('2026-07-30T12:00:00.000Z');
const currentUser: CurrentUser = {
  id: 'user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};
const profile: NutritionCalculationProfile = {
  id: 'profile-id',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  biologicalSex: 'MALE',
  weightKg: 80,
  heightCm: 175,
  activityLevel: 'MODERATE',
  primaryGoal: 'FAT_LOSS',
};
const suggestion = {
  id: 'suggestion-id',
  adultProfileId: profile.id,
  calculationMethod: 'MIFFLIN_ST_JEOR_V1',
  calculationInput: { primaryGoal: 'FAT_LOSS' },
  bmr: new Decimal(1719),
  tdee: new Decimal(2664),
  values: {
    calories: new Decimal(2131),
    proteinGrams: new Decimal(160),
    carbohydrateGrams: new Decimal(240),
    fatGrams: new Decimal(59),
    fiberGrams: new Decimal(30),
  },
  status: 'PENDING' as const,
  createdAt: now,
  expiresAt: new Date('2026-08-06T12:00:00.000Z'),
};

const goal = {
  id: 'goal-id',
  adultProfileId: profile.id,
  validFrom: now,
  validUntil: null,
  values: {
    calories: new Decimal(2150),
    proteinGrams: new Decimal(170),
    carbohydrateGrams: new Decimal(230),
    fatGrams: new Decimal(67),
    fiberGrams: new Decimal(30),
  },
  goalType: 'FAT_LOSS',
  calculationMethod: 'MIFFLIN_ST_JEOR_V1',
  calculationInput: { primaryGoal: 'FAT_LOSS' },
  confirmedById: 'user-id',
  createdAt: now,
  updatedAt: now,
};
