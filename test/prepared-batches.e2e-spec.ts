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
import { CANCEL_PREPARED_BATCH_USE_CASE } from '../src/recipes/application/use-cases/cancel-prepared-batch.use-case';
import { CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE } from '../src/recipes/application/use-cases/confirm-prepared-batch-ingredients.use-case';
import { FINALIZE_PREPARED_BATCH_USE_CASE } from '../src/recipes/application/use-cases/finalize-prepared-batch.use-case';
import { GET_PREPARED_BATCH_USE_CASE } from '../src/recipes/application/use-cases/get-prepared-batch.use-case';
import { START_PREPARED_BATCH_USE_CASE } from '../src/recipes/application/use-cases/start-prepared-batch.use-case';
import { SERVE_PREPARED_BATCH_PORTIONS_USE_CASE } from '../src/recipes/application/use-cases/serve-prepared-batch-portions.use-case';
import { UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE } from '../src/recipes/application/use-cases/update-prepared-batch-ingredients.use-case';
import { PreparedBatch } from '../src/recipes/domain/entities/prepared-batch';

describe('PreparedBatch HTTP API (e2e)', () => {
  let app: INestApplication<App>;
  const getCurrentUser = { execute: jest.fn() };
  const startPreparedBatch = { execute: jest.fn() };
  const updateIngredients = { execute: jest.fn() };
  const getPreparedBatch = { execute: jest.fn() };
  const cancelPreparedBatch = { execute: jest.fn() };
  const confirmIngredients = { execute: jest.fn() };
  const finalizePreparedBatch = { execute: jest.fn() };
  const servePortions = { execute: jest.fn() };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(GET_CURRENT_USER_USE_CASE)
      .useValue(getCurrentUser)
      .overrideProvider(START_PREPARED_BATCH_USE_CASE)
      .useValue(startPreparedBatch)
      .overrideProvider(UPDATE_PREPARED_BATCH_INGREDIENTS_USE_CASE)
      .useValue(updateIngredients)
      .overrideProvider(GET_PREPARED_BATCH_USE_CASE)
      .useValue(getPreparedBatch)
      .overrideProvider(CANCEL_PREPARED_BATCH_USE_CASE)
      .useValue(cancelPreparedBatch)
      .overrideProvider(CONFIRM_PREPARED_BATCH_INGREDIENTS_USE_CASE)
      .useValue(confirmIngredients)
      .overrideProvider(FINALIZE_PREPARED_BATCH_USE_CASE)
      .useValue(finalizePreparedBatch)
      .overrideProvider(SERVE_PREPARED_BATCH_PORTIONS_USE_CASE)
      .useValue(servePortions)
      .compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app, app.get(ConfigService));
    await app.init();
  });

  afterAll(async () => app.close());

  beforeEach(() => {
    getCurrentUser.execute.mockReset().mockResolvedValue(currentUser);
    startPreparedBatch.execute.mockReset().mockResolvedValue(batch);
    updateIngredients.execute.mockReset().mockResolvedValue(batch);
    getPreparedBatch.execute.mockReset().mockResolvedValue(batch);
    cancelPreparedBatch.execute.mockReset().mockResolvedValue(undefined);
    confirmIngredients.execute
      .mockReset()
      .mockResolvedValue({ batch: confirmedBatch, warnings: [] });
    finalizePreparedBatch.execute.mockReset().mockResolvedValue(finalizedBatch);
    servePortions.execute.mockReset().mockResolvedValue({
      preparedBatchId: 'batch-id',
      portions: [
        {
          id: 'portion-id',
          adultProfileId: adultProfileIdPath,
          servedWeight: new Decimal(520),
          estimatedNutrition: { ENERGY_KCAL: new Decimal(204.5454545) },
        },
      ],
      availableWeight: new Decimal(1130),
    });
  });

  it('starts, edits, confirms, finalizes, reads and cancels a prepared batch', async () => {
    await request(app.getHttpServer())
      .post(`/api/recipes/${recipeIdPath}/prepared-batches`)
      .set('Authorization', 'Bearer valid-token')
      .send({ preparedAt: '2026-07-31T12:00:00.000Z' })
      .expect(201)
      .expect((response) => expect(response.body).toHaveProperty('status', 'DRAFT'));

    await request(app.getHttpServer())
      .get(`/api/prepared-batches/${batchIdPath}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) =>
        expect(response.body).toHaveProperty('recipeNameSnapshot', 'Arroz con pollo'),
      );

    await request(app.getHttpServer())
      .patch(`/api/prepared-batches/${batchIdPath}/ingredients`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        ingredients: [
          {
            id: '00000000-0000-4000-8000-000000000012',
            foodId: '00000000-0000-4000-8000-000000000001',
            quantity: 700,
            unit: 'GRAM',
            position: 1,
          },
        ],
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/prepared-batches/${batchIdPath}/confirm-ingredients`)
      .set('Authorization', 'Bearer valid-token')
      .expect(200)
      .expect((response) =>
        expect(response.body).toHaveProperty('status', 'INGREDIENTS_CONFIRMED'),
      );

    await request(app.getHttpServer())
      .post(`/api/prepared-batches/${batchIdPath}/finalize`)
      .set('Authorization', 'Bearer valid-token')
      .send({ finalCookedWeight: 1650, unit: 'GRAM' })
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveProperty('status', 'FINALIZED');
        expect(response.body).toHaveProperty('nutrientsPer100Grams');
      });

    await request(app.getHttpServer())
      .post(`/api/prepared-batches/${batchIdPath}/served-portions`)
      .set('Authorization', 'Bearer valid-token')
      .send({
        portions: [{ adultProfileId: adultProfileIdPath, servedWeight: 520 }],
        servedAt: '2026-07-31T12:30:00.000Z',
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toHaveProperty('preparedBatchId', 'batch-id');
        expect(response.body).toHaveProperty('availableWeight', 1130);
      });

    await request(app.getHttpServer())
      .delete(`/api/prepared-batches/${batchIdPath}`)
      .set('Authorization', 'Bearer valid-token')
      .expect(204);
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

const recipeIdPath = '00000000-0000-4000-8000-000000000010';
const batchIdPath = '00000000-0000-4000-8000-000000000011';
const adultProfileIdPath = '00000000-0000-4000-8000-000000000020';

const batch = createBatch();
const confirmedBatch = createBatch();
confirmedBatch.confirmIngredients(
  [
    {
      ingredientId: 'ingredient-id',
      foodId: 'food-id',
      foodName: 'Rice',
      foodBrand: null,
      preparationState: 'RAW',
      confidenceLevel: 'VERIFIED',
      baseQuantity: 500,
      baseUnit: 'GRAM',
      nutrients: [{ code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Decimal(650) }],
    },
  ],
  new Date('2026-07-31T12:00:00.000Z'),
);
const finalizedBatch = createBatch();
finalizedBatch.confirmIngredients(
  [
    {
      ingredientId: 'ingredient-id',
      foodId: 'food-id',
      foodName: 'Rice',
      foodBrand: null,
      preparationState: 'RAW',
      confidenceLevel: 'VERIFIED',
      baseQuantity: 500,
      baseUnit: 'GRAM',
      nutrients: [{ code: 'ENERGY_KCAL', name: 'Energy', unit: 'kcal', amount: new Decimal(650) }],
    },
  ],
  new Date('2026-07-31T12:00:00.000Z'),
);
finalizedBatch.finalize(1650, new Date('2026-07-31T12:00:00.000Z'));

function createBatch() {
  return PreparedBatch.start({
    id: 'batch-id',
    householdId: 'household-id',
    recipeId: 'recipe-id',
    recipeNameSnapshot: 'Arroz con pollo',
    preparedAt: new Date('2026-07-31T12:00:00.000Z'),
    createdById: 'user-id',
    createdAt: new Date('2026-07-31T12:00:00.000Z'),
    updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    ingredients: [
      {
        id: 'ingredient-id',
        foodId: 'food-id',
        quantity: new Decimal(500),
        unit: 'GRAM',
        servingId: null,
        position: 1,
        notes: null,
        foodNameSnapshot: null,
        brandSnapshot: null,
        preparationStateSnapshot: null,
        confidenceLevel: null,
        baseQuantity: null,
        baseUnit: null,
        nutrients: [],
      },
    ],
  });
}
