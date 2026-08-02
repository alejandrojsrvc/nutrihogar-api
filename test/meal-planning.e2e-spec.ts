import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/configure-application';
import { GET_CURRENT_USER_USE_CASE } from '../src/identity/application/use-cases/get-current-user.use-case';
import {
  CREATE_WEEKLY_PLAN_USE_CASE,
  CreateWeeklyPlanUseCase,
  LIST_WEEKLY_PLANS_QUERY,
  ListWeeklyPlansQuery,
} from '../src/meal-planning/application/use-cases/weekly-plan.use-cases';
import type { WeeklyPlanProps } from '../src/meal-planning/domain/models/meal-planning.models';
import { WeeklyPlanStatus } from '../src/meal-planning/domain/models/meal-planning.models';

describe('Meal planning HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const currentUser = {
    id: 'user-id',
    email: 'user@example.com',
    displayName: null,
    avatarUrl: null,
    timezone: 'UTC',
    locale: 'es',
  };
  type PlanResult = { toProps: () => WeeklyPlanProps };
  type CreatePlanExecute = (
    input: Parameters<CreateWeeklyPlanUseCase['execute']>[0],
  ) => Promise<PlanResult>;
  type ListPlansExecute = (
    input: Parameters<ListWeeklyPlansQuery['execute']>[0],
  ) => Promise<{ items: PlanResult[]; page: number; limit: number; total: number }>;
  const createPlan = { execute: jest.fn<CreatePlanExecute>() };
  const listPlans = { execute: jest.fn<ListPlansExecute>() };
  const plan: PlanResult = {
    toProps: () => ({
      id: 'plan-id',
      householdId: 'household-id',
      weekStart: new Date('2026-08-03'),
      weekEnd: new Date('2026-08-09'),
      status: WeeklyPlanStatus.DRAFT,
      weeklyBudget: null,
      currency: 'ARS',
      createdBy: 'user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      publishedAt: null,
      meals: [],
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue({ execute: jest.fn().mockResolvedValue(currentUser) })
      .overrideProvider(CREATE_WEEKLY_PLAN_USE_CASE)
      .useValue(createPlan)
      .overrideProvider(LIST_WEEKLY_PLANS_QUERY)
      .useValue(listPlans)
      .compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });
  afterAll(async () => app.close());

  it('exposes weekly plan collection endpoints through the authenticated controller', async () => {
    createPlan.execute.mockResolvedValue(plan);
    listPlans.execute.mockResolvedValue({ items: [plan], page: 1, limit: 20, total: 1 });
    await request(app.getHttpServer())
      .post('/api/households/household-id/weekly-plans')
      .set('Authorization', 'Bearer valid-token')
      .send({ weekStart: '2026-08-03' })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/households/household-id/weekly-plans')
      .set('Authorization', 'Bearer valid-token')
      .query({ page: 1, limit: 20 })
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('items', [expect.anything()]));
    expect(listPlans.execute).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 20 }));
  });
});
