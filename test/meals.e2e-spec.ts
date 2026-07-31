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
import { CANCEL_MEAL_USE_CASE } from '../src/meal-tracking/application/use-cases/cancel-meal.use-case';
import { DUPLICATE_MEAL_USE_CASE } from '../src/meal-tracking/application/use-cases/duplicate-meal.use-case';
import { GET_MEAL_USE_CASE } from '../src/meal-tracking/application/use-cases/get-meal.use-case';
import { LIST_MEALS_USE_CASE } from '../src/meal-tracking/application/use-cases/list-meals.use-case';
import { REGISTER_MEAL_USE_CASE } from '../src/meal-tracking/application/use-cases/register-meal.use-case';
import { UPDATE_MEAL_USE_CASE } from '../src/meal-tracking/application/use-cases/update-meal.use-case';

describe('Meals HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const registerMeal = { execute: jest.fn() };
  const listMeals = { execute: jest.fn() };
  const getMeal = { execute: jest.fn() };
  const updateMeal = { execute: jest.fn() };
  const cancelMeal = { execute: jest.fn() };
  const duplicateMeal = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(REGISTER_MEAL_USE_CASE)
      .useValue(registerMeal)
      .overrideProvider(LIST_MEALS_USE_CASE)
      .useValue(listMeals)
      .overrideProvider(GET_MEAL_USE_CASE)
      .useValue(getMeal)
      .overrideProvider(UPDATE_MEAL_USE_CASE)
      .useValue(updateMeal)
      .overrideProvider(CANCEL_MEAL_USE_CASE)
      .useValue(cancelMeal)
      .overrideProvider(DUPLICATE_MEAL_USE_CASE)
      .useValue(duplicateMeal)
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
    registerMeal.execute.mockReset().mockResolvedValue(meal);
    listMeals.execute
      .mockReset()
      .mockResolvedValue({ items: [meal], page: 1, limit: 20, total: 1 });
    getMeal.execute.mockReset().mockResolvedValue(meal);
    updateMeal.execute.mockReset().mockResolvedValue(meal);
    cancelMeal.execute.mockReset().mockResolvedValue(undefined);
    duplicateMeal.execute
      .mockReset()
      .mockResolvedValue({ ...meal, id: 'duplicated-meal-id', source: 'DUPLICATED' });
  });

  it('registers a manual meal', async () => {
    await request(app.getHttpServer())
      .post('/api/households/household-id/meals')
      .set('Authorization', 'Bearer valid-token')
      .send({
        adultProfileId: '00000000-0000-4000-8000-000000000001',
        mealType: 'LUNCH',
        consumedAt: '2026-07-30T09:00:00-03:00',
        notes: null,
        items: [
          {
            foodId: '00000000-0000-4000-8000-000000000002',
            quantity: 220,
            unit: 'GRAM',
            measurementMethod: 'WEIGHED',
          },
        ],
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({ id: 'meal-id', totals: { PROTEIN: 73.06 } }),
        );
      });

    expect(registerMeal.execute).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'user-id', householdId: 'household-id' }),
    );
  });

  it('lists meals and retrieves their snapshot-based detail', async () => {
    await request(app.getHttpServer())
      .get('/api/households/household-id/meals?dateFrom=2026-07-30&includeCancelled=true')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) => expect(response.body).toHaveProperty('items'));

    await request(app.getHttpServer())
      .get('/api/meals/meal-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) =>
        expect(response.body).toEqual(
          expect.objectContaining({
            items: [expect.objectContaining({ nameSnapshot: 'Pollo cocido' })],
          }),
        ),
      );
  });

  it('duplicates a meal with a new destination', async () => {
    await request(app.getHttpServer())
      .post('/api/meals/meal-id/duplicate')
      .set('Authorization', 'Bearer valid-token')
      .send({
        adultProfileId: '00000000-0000-4000-8000-000000000001',
        mealType: 'DINNER',
        consumedAt: '2026-07-30T13:00:00-03:00',
      })
      .expect(201)
      .expect((response) => expect(response.body).toHaveProperty('id', 'duplicated-meal-id'));

    expect(duplicateMeal.execute).toHaveBeenCalledWith(
      expect.objectContaining({ mealId: 'meal-id', mealType: 'DINNER' }),
    );
  });

  it('updates and cancels a meal', async () => {
    await request(app.getHttpServer())
      .patch('/api/meals/meal-id')
      .set('Authorization', 'Bearer valid-token')
      .send({ mealType: 'DINNER' })
      .expect(200);

    await request(app.getHttpServer())
      .delete('/api/meals/meal-id')
      .set('Authorization', 'Bearer valid-token')
      .expect(204);
    expect(cancelMeal.execute).toHaveBeenCalledWith('user-id', 'meal-id');
  });
});

const currentUser: CurrentUser = {
  id: 'user-id',
  email: 'usuario@example.com',
  displayName: 'Alejandro',
  avatarUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
  locale: 'es-AR',
};

const consumedAt = new Date('2026-07-30T12:00:00.000Z');
const meal = {
  id: 'meal-id',
  householdId: 'household-id',
  adultProfileId: 'profile-id',
  mealType: 'LUNCH' as const,
  consumedAt,
  status: 'CONFIRMED' as const,
  source: 'MANUAL' as const,
  notes: null,
  createdById: 'user-id',
  createdAt: consumedAt,
  updatedAt: consumedAt,
  deletedAt: null,
  items: [
    {
      id: 'item-id',
      foodId: 'food-id',
      foodServingId: null,
      nameSnapshot: 'Pollo cocido',
      brandSnapshot: null,
      preparationStateSnapshot: 'COOKED',
      quantity: new Decimal(220),
      unit: 'GRAM',
      baseQuantity: new Decimal(220),
      baseUnit: 'GRAM',
      measurementMethod: 'WEIGHED' as const,
      confidenceLevel: 'VERIFIED' as const,
      nutrients: [
        {
          id: 'snapshot-id',
          nutrientCode: 'PROTEIN',
          nutrientName: 'Proteína',
          unit: 'g',
          amount: new Decimal('73.06'),
        },
      ],
    },
  ],
};
